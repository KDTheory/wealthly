"""
Authentication endpoints: register, login, logout, password reset.

Security guarantees added in this module:
  - Every login / register / reset attempt is recorded in `auth_events`
    (success or failure, with IP + user-agent) so /admin can review.
  - Brute-force lockout: 5 failed logins on the same IP **or** the same
    email within 15 minutes triggers a 30-minute block. Detection lives
    in `app.security.is_locked_out`.
  - Password complexity: ≥10 chars, letters + digits, not in HIBP.
  - Auth cookie: on successful login/register/reset we ALSO set an
    HttpOnly + Secure + SameSite=None cookie carrying the JWT. The
    legacy `access_token` JSON field is still returned for the duration
    of the frontend transition; it will be removed once the frontend
    switches to cookie auth fully.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Household, Category, PasswordResetToken
from app.rate_limit import limiter
from app.schemas import (
    UserCreate, UserLogin, Token, UserOut,
    ForgotPasswordRequest, ResetPasswordRequest, MessageOut,
)
from app.auth import (
    hash_password, verify_password, create_access_token, get_current_user,
    set_auth_cookie, clear_auth_cookie,
)
from app.defaults import DEFAULT_CATEGORIES
from app.config import settings
from app.email_service import send_password_reset_email
from app.security import record_auth_event, is_locked_out, validate_password

router = APIRouter(prefix="/auth", tags=["auth"])

# Token settings
RESET_TOKEN_TTL_MINUTES = 60


def _hash_reset_token(token: str) -> str:
    """SHA-256 of the raw token, hex-encoded. Stored in DB; the raw token
    only ever travels in the email link, never in the database."""
    return hashlib.sha256(token.encode()).hexdigest()


def _client_ip(request: Request) -> str | None:
    xff = request.headers.get("x-forwarded-for")
    if xff:
        return xff.split(",")[0].strip()
    return request.client.host if request.client else None


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, response: Response, payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new household with its first admin user. Seeds default categories."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        record_auth_event(db, kind="register_failure", success=False, request=request,
                          email=payload.email, detail="email_already_registered")
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    ok, err = validate_password(payload.password)
    if not ok:
        record_auth_event(db, kind="register_failure", success=False, request=request,
                          email=payload.email, detail=err or "weak_password")
        raise HTTPException(status_code=400, detail=err)

    household = Household(name=payload.household_name or "Mon foyer")
    db.add(household)
    db.flush()

    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_admin=True,
        household_id=household.id,
    )
    db.add(user)

    for cat in DEFAULT_CATEGORIES:
        db.add(Category(household_id=household.id, **cat))

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, household.id)
    set_auth_cookie(response, token)
    record_auth_event(db, kind="register_success", success=True, request=request,
                      user_id=user.id, email=user.email)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, response: Response, payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return a JWT (also sets an HttpOnly cookie)."""
    ip = _client_ip(request)

    if is_locked_out(db, email=payload.email, ip=ip):
        record_auth_event(db, kind="login_failure", success=False, request=request,
                          email=payload.email, detail="locked_out")
        raise HTTPException(
            status_code=429,
            detail="Trop de tentatives échouées. Réessayez dans 30 minutes ou réinitialisez votre mot de passe.",
        )

    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        record_auth_event(db, kind="login_failure", success=False, request=request,
                          email=payload.email,
                          detail="bad_credentials" if user else "unknown_email")
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token(user.id, user.household_id)
    set_auth_cookie(response, token)
    record_auth_event(db, kind="login_success", success=True, request=request,
                      user_id=user.id, email=user.email)
    return Token(access_token=token)


@router.post("/logout", response_model=MessageOut)
def logout(request: Request, response: Response, db: Session = Depends(get_db)):
    """Clear the auth cookie. We don't blacklist the JWT itself (stateless
    by design) but the cookie disappears so subsequent requests fail the
    cookie path. The Bearer header path is also obsolete after frontend
    swap. Audit log records the explicit logout."""
    clear_auth_cookie(response)
    # Best-effort: log who logged out if we can resolve them.
    try:
        from app.auth import get_token_from_request, decode_access_token
        token = get_token_from_request(request)
        user_id = None
        email = None
        if token:
            payload = decode_access_token(token)
            user_id = payload.get("sub") if payload else None
            if user_id:
                u = db.query(User).filter(User.id == user_id).first()
                email = u.email if u else None
        record_auth_event(db, kind="logout", success=True, request=request,
                          user_id=user_id, email=email)
    except Exception:
        pass
    return MessageOut(message="Déconnecté.")


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user."""
    return current_user


@router.post("/forgot-password", response_model=MessageOut)
@limiter.limit("5/minute")
def forgot_password(request: Request, payload: ForgotPasswordRequest, db: Session = Depends(get_db)):
    """Generate a single-use reset token and email it to the user.

    Always returns a generic success message — even if the email is unknown
    — to avoid leaking which addresses are registered.
    """
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if user:
        db.query(PasswordResetToken).filter(
            PasswordResetToken.user_id == user.id,
            PasswordResetToken.used_at.is_(None),
        ).update({"used_at": datetime.utcnow()})

        raw_token = secrets.token_urlsafe(32)
        record = PasswordResetToken(
            user_id=user.id,
            token_hash=_hash_reset_token(raw_token),
            expires_at=datetime.utcnow() + timedelta(minutes=RESET_TOKEN_TTL_MINUTES),
        )
        db.add(record)
        db.commit()

        link = f"{settings.FRONTEND_URL.rstrip('/')}/?reset_token={raw_token}"
        send_password_reset_email(user.email, user.full_name, link)

    record_auth_event(db, kind="password_reset_request", success=True, request=request,
                      email=payload.email,
                      user_id=user.id if user else None)
    return MessageOut(message="Si cet email existe, un lien de réinitialisation a été envoyé.")


@router.post("/reset-password", response_model=Token)
def reset_password(request: Request, response: Response, payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Consume a reset token and replace the user's password."""
    ok, err = validate_password(payload.new_password)
    if not ok:
        raise HTTPException(status_code=400, detail=err)

    token_hash = _hash_reset_token(payload.token)
    record = (
        db.query(PasswordResetToken)
        .filter(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
            PasswordResetToken.expires_at > datetime.utcnow(),
        )
        .first()
    )
    if not record:
        record_auth_event(db, kind="password_reset_failure", success=False, request=request,
                          detail="invalid_or_expired_token")
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré. Demandez un nouveau lien.")

    user = db.query(User).filter(User.id == record.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable.")

    user.hashed_password = hash_password(payload.new_password)
    record.used_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, user.household_id)
    set_auth_cookie(response, token)
    record_auth_event(db, kind="password_reset_success", success=True, request=request,
                      user_id=user.id, email=user.email)
    return Token(access_token=token)
