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

    # CORS — comma-separated list of allowed origins
    CORS_ORIGINS: list[str] = os.getenv(
        "CORS_ORIGINS",
        "http://localhost:3000,http://localhost:5173"
    ).split(",")

    # Anthropic (optional — enables AI categorization)
    ANTHROPIC_API_KEY: str | None = os.getenv("ANTHROPIC_API_KEY")

    # App
    APP_NAME: str = "Wealthly API"
    DEBUG: bool = os.getenv("DEBUG", "false").lower() == "true"


settings = Settings()
