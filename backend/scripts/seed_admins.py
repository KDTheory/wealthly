"""
seed_admins.py — One-shot script to create or promote admin accounts.

Usage (Railway):
    railway run python backend/scripts/seed_admins.py

Required env vars (set in Railway → Variables or in a local .env):
    ADMIN_1_EMAIL      e.g. kevin@example.com
    ADMIN_1_PASSWORD   Strong password (≥ 10 chars, letters + digits)
    ADMIN_1_NAME       e.g. "Kevin"

    ADMIN_2_EMAIL      e.g. raphael@example.com
    ADMIN_2_PASSWORD
    ADMIN_2_NAME       e.g. "Raphaël"

    DATABASE_URL       Already set on Railway.

What it does:
  - If the email already exists → sets is_admin=True, is_active=True, updates
    full_name and password (so you can also use it to reset an admin password).
  - If the email doesn't exist → creates a new Household + User with is_admin=True.
  - Idempotent: safe to run multiple times.
"""
import os
import sys
import uuid

# Make sure the app package is importable whether we run from repo root or from backend/
sys.path.insert(0, os.path.join(os.path.dirname(__file__), '..'))

from app.database import SessionLocal, engine, Base
from app.models import Household, User
from app.auth import hash_password

Base.metadata.create_all(bind=engine)


def _uuid() -> str:
    return str(uuid.uuid4())


def ensure_admin(db, email: str, password: str, name: str) -> None:
    email = email.strip().lower()
    if not email or not password or not name:
        print(f"  ⚠  Skipping empty credentials for {email!r}")
        return

    existing = db.query(User).filter(User.email == email).first()
    if existing:
        existing.hashed_password = hash_password(password)
        existing.full_name = name
        existing.is_admin = True
        existing.is_active = True
        db.commit()
        print(f"  ✅ Updated existing user → admin: {email}")
    else:
        # Create a personal household for this admin
        household = Household(id=_uuid(), name=f"Foyer {name}")
        db.add(household)
        db.flush()

        user = User(
            id=_uuid(),
            email=email,
            hashed_password=hash_password(password),
            full_name=name,
            is_admin=True,
            is_active=True,
            household_id=household.id,
        )
        db.add(user)
        db.commit()
        print(f"  ✅ Created new admin user: {email}")


def main() -> None:
    admins = [
        (
            os.getenv("ADMIN_1_EMAIL", ""),
            os.getenv("ADMIN_1_PASSWORD", ""),
            os.getenv("ADMIN_1_NAME", "Admin 1"),
        ),
        (
            os.getenv("ADMIN_2_EMAIL", ""),
            os.getenv("ADMIN_2_PASSWORD", ""),
            os.getenv("ADMIN_2_NAME", "Admin 2"),
        ),
    ]

    db = SessionLocal()
    try:
        print("🔐 Seeding admin accounts...")
        for email, password, name in admins:
            if email:
                ensure_admin(db, email, password, name)
            else:
                print(f"  ⏭  Skipping (email not set)")
        print("✅ Done.")
    finally:
        db.close()


if __name__ == "__main__":
    main()
