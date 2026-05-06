"""
Per-IP rate limiting on auth endpoints.

We expose a single Limiter instance so both main.py (to register the exception
handler + set app.state.limiter) and routers/auth.py (for the decorators) bind
to the same one.

Limits are intentionally generous for legitimate users on shared NATs (offices,
mobile carriers) but tight enough to slow down credential-stuffing or password-
reset spamming.
"""
from fastapi import Request
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

limiter = Limiter(key_func=get_remote_address)


def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
    """Custom 429 handler — returns the French message users see in toasts."""
    return JSONResponse(
        status_code=429,
        content={"detail": "Trop de tentatives. Réessaie dans quelques instants."},
    )
