"""Authentication: register, login, /me."""


def test_register_creates_user_and_returns_jwt(client):
    resp = client.post(
        "/auth/register",
        json={"email": "bob@example.com", "password": "longenough", "full_name": "Bob", "household_name": "Foyer"},
    )
    assert resp.status_code == 201, resp.text
    data = resp.json()
    assert "access_token" in data
    assert data["access_token"]


def test_register_rejects_duplicate_email(client, registered_user):
    resp = client.post(
        "/auth/register",
        json={"email": registered_user["email"], "password": "anotherlongpass", "full_name": "X"},
    )
    assert resp.status_code == 400


def test_login_success(client, registered_user):
    resp = client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert resp.status_code == 200
    assert resp.json()["access_token"]


def test_login_wrong_password(client, registered_user):
    resp = client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": "wrongwrong"},
    )
    assert resp.status_code == 401


def test_login_unknown_email(client):
    resp = client.post("/auth/login", json={"email": "ghost@example.com", "password": "whatever"})
    assert resp.status_code == 401


def test_me_returns_current_user(client, registered_user, auth_headers):
    resp = client.get("/auth/me", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json()["email"] == registered_user["email"]


def test_me_rejects_unauthenticated(client):
    resp = client.get("/auth/me")
    assert resp.status_code == 401


def test_me_rejects_bogus_token(client):
    resp = client.get("/auth/me", headers={"Authorization": "Bearer not-a-real-token"})
    assert resp.status_code == 401
