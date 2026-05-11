"""Password reset flow: forgot → email captured → reset → login with new pwd."""


def _request_reset(client, email):
    resp = client.post("/auth/forgot-password", json={"email": email})
    assert resp.status_code == 200
    return resp


def test_forgot_password_returns_generic_message_for_unknown_email(client):
    """No account enumeration — same response whether the email exists or not."""
    resp = _request_reset(client, "nobody@example.com")
    assert "lien de réinitialisation" in resp.json()["message"]
    assert client.sent_emails == []  # no email sent — user doesn't exist


def test_forgot_password_emails_known_user(client, registered_user):
    _request_reset(client, registered_user["email"])
    assert len(client.sent_emails) == 1
    sent = client.sent_emails[0]
    assert sent["to"] == registered_user["email"]
    assert "reset_token=" in sent["reset_link"]


def test_reset_password_works_end_to_end(client, registered_user):
    _request_reset(client, registered_user["email"])
    link = client.sent_emails[0]["reset_link"]
    raw_token = link.split("reset_token=")[1]
    new_password = "brandnewpass99"

    resp = client.post(
        "/auth/reset-password",
        json={"token": raw_token, "new_password": new_password},
    )
    assert resp.status_code == 200
    # Should issue a fresh JWT for the user.
    assert resp.json()["access_token"]

    # New password works for login…
    login = client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": new_password},
    )
    assert login.status_code == 200
    # …and the old one no longer does.
    old_login = client.post(
        "/auth/login",
        json={"email": registered_user["email"], "password": registered_user["password"]},
    )
    assert old_login.status_code == 401


def test_reset_password_token_is_single_use(client, registered_user):
    _request_reset(client, registered_user["email"])
    raw_token = client.sent_emails[0]["reset_link"].split("reset_token=")[1]

    first = client.post("/auth/reset-password", json={"token": raw_token, "new_password": "firstchoice1"})
    assert first.status_code == 200

    second = client.post("/auth/reset-password", json={"token": raw_token, "new_password": "secondchoice2"})
    assert second.status_code == 400


def test_reset_password_rejects_invalid_token(client):
    resp = client.post(
        "/auth/reset-password",
        json={"token": "totally-bogus-token", "new_password": "validpass1"},
    )
    assert resp.status_code == 400


def test_reset_password_rejects_short_password(client, registered_user):
    _request_reset(client, registered_user["email"])
    raw_token = client.sent_emails[0]["reset_link"].split("reset_token=")[1]

    resp = client.post("/auth/reset-password", json={"token": raw_token, "new_password": "short"})
    assert resp.status_code == 400


def test_new_request_invalidates_previous_token(client, registered_user):
    """Asking for a second reset link should invalidate the first one."""
    _request_reset(client, registered_user["email"])
    first_token = client.sent_emails[0]["reset_link"].split("reset_token=")[1]

    _request_reset(client, registered_user["email"])
    second_token = client.sent_emails[1]["reset_link"].split("reset_token=")[1]
    assert first_token != second_token

    # The first one should now be rejected.
    resp = client.post("/auth/reset-password", json={"token": first_token, "new_password": "newpass1234"})
    assert resp.status_code == 400

    # The second one still works.
    resp2 = client.post("/auth/reset-password", json={"token": second_token, "new_password": "newpass1234"})
    assert resp2.status_code == 200
