"""
Authentication endpoints: register, login, password reset.
"""
import hashlib
import secrets
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Household, Category, PasswordResetToken
from app.rate_limit import limiter
from app.schemas import (
    UserCreate, UserLogin, Token, UserOut,
    ForgotPasswordRequest, ResetPasswordRequest, MessageOut,
)
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.defaults import DEFAULT_CATEGORIES
from app.config import settings
from app.email_service import send_password_reset_email

router = APIRouter(prefix="/auth", tags=["auth"])

# Token settings
RESET_TOKEN_TTL_MINUTES = 60


def _hash_reset_token(token: str) -> str:
    """SHA-256 of the raw token, hex-encoded. Stored in DB; the raw token
    only ever travels in the email link, never in the database."""
    return hashlib.sha256(token.encode()).hexdigest()


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
def register(request: Request, payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new household with its first admin user. Seeds default categories."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # Create household
    household = Household(name=payload.household_name or "Mon foyer")
    db.add(household)
    db.flush()  # generate household.id without committing

    # Create user (first user = admin)
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_admin=True,
        household_id=household.id,
    )
    db.add(user)

    # Seed default categories for the household
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(household_id=household.id, **cat))

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, household.id)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
def login(request: Request, payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return a JWT."""
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token(user.id, user.household_id)
    return Token(access_token=token)


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
        # Invalidate any earlier tokens this user might have outstanding.
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

    return MessageOut(message="Si cet email existe, un lien de réinitialisation a été envoyé.")


@router.post("/reset-password", response_model=Token)
def reset_password(payload: ResetPasswordRequest, db: Session = Depends(get_db)):
    """Consume a reset token and replace the user's password."""
    if not payload.new_password or len(payload.new_password) < 8:
        raise HTTPException(status_code=400, detail="Le mot de passe doit faire au moins 8 caractères.")

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
        raise HTTPException(status_code=400, detail="Lien invalide ou expiré. Demandez un nouveau lien.")

    user = db.query(User).filter(User.id == record.user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=400, detail="Utilisateur introuvable.")

    user.hashed_password = hash_password(payload.new_password)
    record.used_at = datetime.utcnow()
    db.commit()
    db.refresh(user)

    # Issue a fresh JWT so the user lands logged-in directly after resetting.
    token = create_access_token(user.id, user.household_id)
    return Token(access_token=token)
