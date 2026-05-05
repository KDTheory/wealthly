"""
Pytest fixtures shared by every test module.

Each test gets a fresh in-memory SQLite database — no Postgres / Supabase
needed in CI. Email sending is mocked so password-reset tests don't rely
on Resend.
"""
import os

# Force test settings BEFORE importing the app.
os.environ["DATABASE_URL"] = "sqlite:///:memory:"
os.environ["SECRET_KEY"] = "test-secret-do-not-use-in-prod"
os.environ["RESEND_API_KEY"] = ""  # disabled — email_service returns False
os.environ["FRONTEND_URL"] = "http://test"

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

from app.database import Base, get_db
from app.main import app


@pytest.fixture()
def db_engine():
    """Fresh sqlite-in-memory engine per test."""
    engine = create_engine(
        "sqlite:///:memory:",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    yield engine
    Base.metadata.drop_all(bind=engine)
    engine.dispose()


@pytest.fixture()
def db_session(db_engine):
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture()
def client(db_engine, monkeypatch):
    """FastAPI TestClient bound to the in-memory DB and a mocked emailer."""
    SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=db_engine)

    def override_get_db():
        db = SessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db

    # Capture password-reset emails instead of POSTing to Resend.
    sent_emails = []

    def fake_send_password_reset_email(to, full_name, reset_link):
        sent_emails.append({"to": to, "full_name": full_name, "reset_link": reset_link})
        return True

    # Patch in both modules where the function may be referenced.
    monkeypatch.setattr("app.email_service.send_password_reset_email", fake_send_password_reset_email)
    monkeypatch.setattr("app.routers.auth.send_password_reset_email", fake_send_password_reset_email)

    test_client = TestClient(app)
    test_client.sent_emails = sent_emails  # expose the inbox to tests
    yield test_client
    app.dependency_overrides.clear()


@pytest.fixture()
def registered_user(client):
    """Register a user and return (token, email, password)."""
    email = "alice@example.com"
    password = "supersecret123"
    resp = client.post(
        "/auth/register",
        json={"email": email, "password": password, "full_name": "Alice", "household_name": "Foyer Alice"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    return {"token": token, "email": email, "password": password}


@pytest.fixture()
def auth_headers(registered_user):
    return {"Authorization": f"Bearer {registered_user['token']}"}
