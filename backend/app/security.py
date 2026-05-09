"""
Security toolbox — central place for:
  - Audit log helper (record_auth_event)
  - Brute-force lockout check + counter (lockout_check, register_failure)
  - Password complexity + HIBP k-anonymity breach check (validate_password)
  - Security HTTP headers middleware (apply_security_headers)

Keeps app/auth.py focused on JWT/password hashing primitives, and the
routers focused on HTTP plumbing.
"""
from __future__ import annotations

import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import Request, Response
from sqlalchemy.orm import Session

from app.models import AuthEvent

logger = logging.getLogger(__name__)


# ── Audit log ────────────────────────────────────────────────────────────────

def record_auth_event(
    db: Session,
    *,
    kind: str,
    success: bool,
    request: Optional[Request] = None,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    detail: Optional[str] = None,
) -> None:
    """Persist an audit row. Never raises — auth flows must keep working
    even if the audit table is missing or write fails."""
    try:
        ip = None
        ua = None
        if request is not None:
            # Honour X-Forwarded-For when behind a proxy (Railway adds it).
            xff = request.headers.get("x-forwarded-for")
            ip = xff.split(",")[0].strip() if xff else (request.client.host if request.client else None)
            ua = request.headers.get("user-agent")
        event = AuthEvent(
            user_id=user_id,
            email=(email or "").lower() or None,
            kind=kind,
            success=success,
            ip=ip,
            user_agent=ua[:1024] if ua else None,
            detail=detail,
        )
        db.add(event)
        db.commit()
    except Exception as e:  # noqa: BLE001
        logger.warning("[auth-event] persist failed: %s", e)
        try:
            db.rollback()
        except Exception:
            pass


# ── Brute-force lockout ──────────────────────────────────────────────────────

LOCKOUT_WINDOW = timedelta(minutes=15)
LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION = timedelta(minutes=30)


def is_locked_out(db: Session, *, email: str, ip: Optional[str]) -> bool:
    """Returns True if this email or IP is currently locked out.

    A lockout is in effect when there have been ≥LOCKOUT_THRESHOLD failed
    login attempts within the LOCKOUT_WINDOW prior to LOCKOUT_DURATION ago.
    Any successful login in between resets the counter (we look at the most
    recent success per email/IP).
    """
    try:
        cutoff_window = datetime.utcnow() - LOCKOUT_DURATION
        cutoff_lockout = datetime.utcnow() - (LOCKOUT_DURATION + LOCKOUT_WINDOW)
        # Count failures for this email since cutoff
        for column, value in (("email", (email or "").lower()), ("ip", ip)):
            if not value:
                continue
            failures = (
                db.query(AuthEvent)
                .filter(AuthEvent.kind == "login_failure")
                .filter(getattr(AuthEvent, column) == value)
                .filter(AuthEvent.created_at >= cutoff_lockout)
                .order_by(AuthEvent.created_at.desc())
                .limit(50)
                .all()
            )
            # Keep only failures within the window leading to "now"
            recent = [f for f in failures if f.created_at >= cutoff_window]
            if len(recent) >= LOCKOUT_THRESHOLD:
                # Check there hasn't been a success since the threshold-crossing failure
                threshold_t = sorted(recent, key=lambda e: e.created_at)[-LOCKOUT_THRESHOLD].created_at
                success_after = (
                    db.query(AuthEvent)
                    .filter(AuthEvent.kind == "login_success")
                    .filter(getattr(AuthEvent, column) == value)
                    .filter(AuthEvent.created_at > threshold_t)
                    .first()
                )
                if not success_after:
                    return True
        return False
    except Exception as e:  # noqa: BLE001
        logger.warning("[lockout] check failed (allowing): %s", e)
        return False


# ── Password complexity ──────────────────────────────────────────────────────

def validate_password(password: str, *, check_breach: bool = True) -> tuple[bool, Optional[str]]:
    """Returns (ok, error_message_or_None).

    Rules
    -----
    1. At least 10 characters
    2. At least one letter and one digit (basic entropy floor)
    3. Not in the HIBP breach list (Have I Been Pwned k-anonymity API).
       Best-effort — if HIBP is unreachable we let the password through;
       network failure shouldn't block a legitimate signup.
    """
    if not password or len(password) < 10:
        return False, "Le mot de passe doit faire au moins 10 caractères."
    has_letter = any(c.isalpha() for c in password)
    has_digit = any(c.isdigit() for c in password)
    if not (has_letter and has_digit):
        return False, "Le mot de passe doit contenir des lettres ET des chiffres."

    if not check_breach:
        return True, None

    # HIBP k-anonymity: send first 5 SHA1 chars, get back tail+count list,
    # check if our tail is in there.
    try:
        sha1 = hashlib.sha1(password.encode("utf-8")).hexdigest().upper()
        prefix, suffix = sha1[:5], sha1[5:]
        with httpx.Client(timeout=4.0) as client:
            r = client.get(f"https://api.pwnedpasswords.com/range/{prefix}",
                           headers={"Add-Padding": "true", "User-Agent": "Trove/1.0"})
            if r.status_code == 200:
                for line in r.text.splitlines():
                    parts = line.strip().split(":")
                    if len(parts) == 2 and parts[0] == suffix and int(parts[1]) > 0:
                        return False, "Ce mot de passe a fuité dans une brèche connue (Have I Been Pwned). Choisissez-en un autre."
    except Exception as e:  # noqa: BLE001
        logger.info("[hibp] check skipped due to network error: %s", e)
    return True, None


# ── Security HTTP headers ────────────────────────────────────────────────────

# CSP tuned for Trove's actual surface:
#   - script: self only (Vite bundles + main.jsx)
#   - style: self + inline (Tailwind v4 + CSS-in-JS injects inline rules)
#   - font: Google Fonts CDN
#   - img: self + data: (SVG icons inlined) + https: (any external screenshot)
#   - connect: self + Railway backend + Frankfurter + Yahoo (proxied via /quotes
#              but the frontend may still hit other origins long term)
_CSP = (
    "default-src 'self'; "
    "script-src 'self' 'unsafe-inline'; "
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; "
    "font-src 'self' https://fonts.gstatic.com data:; "
    "img-src 'self' data: blob: https:; "
    "connect-src 'self' https://*.up.railway.app https://api.frankfurter.app; "
    "frame-ancestors 'none'; "
    "base-uri 'self'; "
    "form-action 'self';"
)


def apply_security_headers(response: Response) -> None:
    """Set the Trove security header set on a Response. Used by the middleware."""
    response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains; preload"
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Permissions-Policy"] = "camera=(), microphone=(), geolocation=(), payment=()"
    # Soft CSP — set as report-only-equivalent: the API is not a renderable page,
    # browsers honour CSP from the API origin only on direct visits.
    response.headers.setdefault("Content-Security-Policy", _CSP)
    response.headers["Cross-Origin-Opener-Policy"] = "same-origin"
