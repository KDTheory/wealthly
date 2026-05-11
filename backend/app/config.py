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

    # Enable Banking (open banking sync)
    ENABLE_BANKING_APP_ID: str = os.getenv("ENABLE_BANKING_APP_ID", "")
    # For production: base64-encoded private key in env var
    ENABLE_BANKING_PRIVATE_KEY_B64: str = os.getenv("ENABLE_BANKING_PRIVATE_KEY_B64", "")
    ENABLE_BANKING_REDIRECT_URI: str = os.getenv(
        "ENABLE_BANKING_REDIRECT_URI",
        "https://wealthly-git-main-wealthly.vercel.app"
    )
    ENABLE_BANKING_API_BASE: str = "https://api.enablebanking.com"

    # App
    APP_NAME: str = "Wealthly API"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


settings = Settings()
