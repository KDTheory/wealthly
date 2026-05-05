"""
Centralised configuration loaded from environment variables.
All sensitive values come from .env (never committed to Git).
"""
import os
from pathlib import Path
from dotenv import load_dotenv

# Load .env file if present (for local dev outside Docker)
ENV_FILE = Path(__file__).parent.parent / ".env"
if ENV_FILE.exists():
    load_dotenv(ENV_FILE)


class Settings:
    # Database
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql://wealthly:wealthly@db:5432/wealthly"
    )

    # JWT auth
    SECRET_KEY: str = os.getenv("SECRET_KEY", "CHANGE_ME_IN_PRODUCTION_PLEASE")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "10080"))  # 7 days

    # CORS — comma-separated list of allowed origins (exact match)
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # CORS regex — matches all Vercel deployments by default
    # (each Vercel deploy gets a new hash-prefix URL, so a regex is needed
    # alongside the exact list).
    CORS_ORIGIN_REGEX: str = os.getenv(
        "CORS_ORIGIN_REGEX",
        r"^https://wealthly(-[a-z0-9-]+)?\.vercel\.app$"
    )

    # Anthropic (optional — enables AI categorization)
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")

    # Email (optional — enables password reset). Set RESEND_API_KEY in env.
    RESEND_API_KEY: str | None = os.getenv("RESEND_API_KEY")
    # Sender address. Use Resend's testing address if no domain is verified yet.
    EMAIL_FROM: str = os.getenv("EMAIL_FROM", "Wealthly <onboarding@resend.dev>")
    # Public URL of the frontend, used to build password-reset links.
    FRONTEND_URL: str = os.getenv("FRONTEND_URL", "https://wealthly-six.vercel.app")

    # GoCardless Bank Account Data (PSD2 aggregator) — optional.
    # Without these, the /banks endpoints return 503.
    GOCARDLESS_SECRET_ID: str | None = os.getenv("GOCARDLESS_SECRET_ID")
    GOCARDLESS_SECRET_KEY: str | None = os.getenv("GOCARDLESS_SECRET_KEY")
    # Where the bank redirects the user after they validate the consent.
    # Must point to the frontend route that handles the callback.
    GOCARDLESS_REDIRECT_URI: str = os.getenv(
        "GOCARDLESS_REDIRECT_URI",
        "https://wealthly-six.vercel.app/bank-callback",
    )
    # PSD2 consent length in days (max 90).
    GOCARDLESS_ACCESS_VALID_DAYS: int = int(os.getenv("GOCARDLESS_ACCESS_VALID_DAYS", "90"))
    # How many days of historical transactions to pull on first sync (max 90 typical).
    GOCARDLESS_HISTORICAL_DAYS: int = int(os.getenv("GOCARDLESS_HISTORICAL_DAYS", "90"))

    # App
    APP_NAME: str = "Wealthly API"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


settings = Settings()
