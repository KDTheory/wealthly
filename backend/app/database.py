"""
SQLAlchemy database setup. Provides:
- engine: connection to Postgres
- SessionLocal: factory for DB sessions
- Base: parent class for all ORM models
- get_db: FastAPI dependency yielding a session
"""
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

from app.config import settings

if settings.DATABASE_URL.startswith("sqlite"):
    engine = create_engine(
        settings.DATABASE_URL,
        connect_args={"check_same_thread": False},
    )
else:
    engine = create_engine(
        settings.DATABASE_URL,
        pool_pre_ping=True,
        pool_size=5,
        max_overflow=10,
    )

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    """FastAPI dependency: provides a DB session, closes it after request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
