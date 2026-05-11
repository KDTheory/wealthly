"""
Authentication: password hashing (bcrypt) + JWT generation/validation.

Token transport — Trove uses an HttpOnly, Secure, SameSite=None cookie
(`trove_session`) so the token is unreachable from JavaScript and resistant
to XSS exfiltration. The legacy `Authorization: Bearer <token>` header is
still accepted as a fallback during the frontend transition; it will be
phased out once api.js fully relies on the cookie.

Flow:
1. Register / Login / Reset-password → backend `Set-Cookie: trove_session`
   AND returns the token in the JSON body (legacy field, deprecated).
2. Authenticated requests → the browser auto-sends the cookie.
3. Logout → `/auth/logout` clears the cookie.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import Depends, HTTPException, Request, Response, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import User

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
# auto_error=False so we can fall back to the cookie when no Bearer header
# is sent — without OAuth2PasswordBearer raising 401 first.
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login", auto_error=False)

COOKIE_NAME = "trove_session"


def hash_password(password: str) -> str:
    """Hash a plain password using bcrypt."""
    return pwd_context.hash(password)


def verify_password(plain: str, hashed: str) -> bool:
    """Verify a plain password against its bcrypt hash."""
    return pwd_context.verify(plain, hashed)


def create_access_token(user_id: str, household_id: str) -> str:
    """Create a signed JWT containing user_id and household_id."""
    expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    payload = {
        "sub": user_id,
        "hh": household_id,
        "exp": expire,
    }
    return jwt.encode(payload, settings.SECRET_KEY, algorithm=settings.ALGORITHM)


def decode_token(token: str) -> dict:
    """Decode and validate a JWT. Raises 401 on failure."""
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )


def decode_access_token(token: str) -> Optional[dict]:
    """Like decode_token but returns None on failure instead of raising.
    Used by the audit-log resolver in /auth/logout."""
    try:
        return jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
    except JWTError:
        return None


# ── Cookie helpers ──────────────────────────────────────────────────────────

def set_auth_cookie(response: Response, token: str) -> None:
    """Set the auth cookie. SameSite=None + Secure because the API and
    the frontend live on different origins (Vercel ↔ Railway), which means
    the cookie has to be cross-site-eligible. HttpOnly keeps it unreachable
    from JS, so XSS cannot exfiltrate the session."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        max_age=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        httponly=True,
        secure=True,
        samesite="none",
        path="/",
    )


def clear_auth_cookie(response: Response) -> None:
    response.delete_cookie(key=COOKIE_NAME, path="/")


def get_token_from_request(request: Request) -> Optional[str]:
    """Read the auth token from cookie first, then fall back to the
    Authorization: Bearer header (transition window)."""
    cookie_token = request.cookies.get(COOKIE_NAME)
    if cookie_token:
        return cookie_token
    auth = request.headers.get("authorization") or ""
    if auth.lower().startswith("bearer "):
        return auth.split(None, 1)[1].strip()
    return None


# ── Current-user dependency ─────────────────────────────────────────────────

def get_current_user(
    request: Request,
    bearer_token: Optional[str] = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    """FastAPI dependency: returns the User for the current request, or 401.

    Token resolution order:
      1. trove_session HttpOnly cookie (preferred, XSS-safe)
      2. Authorization: Bearer header (legacy, kept for transition)
    """
    token = request.cookies.get(COOKIE_NAME) or bearer_token
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")

    payload = decode_token(token)
    user_id = payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token")
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found or inactive")
    return user


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Dependency for /admin/* endpoints. 403 if the caller isn't admin."""
    if not getattr(user, "is_admin", False):
        raise HTTPException(status_code=403, detail="Accès admin requis")
    return user
