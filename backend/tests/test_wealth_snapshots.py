"""Wealth snapshots: list / upsert / single-entry-per-month."""


def _snapshot(month="2026-01", net=10000, liquid=4000, assets=8000, liab=2000):
    return {
        "month": month,
        "net_worth": net,
        "liquid_wealth": liquid,
        "assets_value": assets,
        "liabilities_value": liab,
    }


def test_list_empty_at_first(client, auth_headers):
    resp = client.get("/wealth/snapshots", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_snapshot(client, auth_headers):
    resp = client.post("/wealth/snapshots", json=_snapshot(), headers=auth_headers)
    assert resp.status_code == 201
    body = resp.json()
    assert body["month"] == "2026-01"
    assert body["net_worth"] == 10000
    assert "id" in body
    assert "captured_at" in body


def test_upsert_replaces_existing_month(client, auth_headers):
    """Posting a second snapshot for the same month overwrites — no duplicates."""
    client.post("/wealth/snapshots", json=_snapshot(month="2026-02", net=5000), headers=auth_headers)
    client.post("/wealth/snapshots", json=_snapshot(month="2026-02", net=12000), headers=auth_headers)

    resp = client.get("/wealth/snapshots", headers=auth_headers)
    assert resp.status_code == 200
    rows = resp.json()
    assert len(rows) == 1
    assert rows[0]["net_worth"] == 12000


def test_list_returns_chronological(client, auth_headers):
    for m, net in [("2026-03", 1000), ("2026-01", 500), ("2026-02", 800)]:
        client.post("/wealth/snapshots", json=_snapshot(month=m, net=net), headers=auth_headers)

    resp = client.get("/wealth/snapshots", headers=auth_headers)
    months = [r["month"] for r in resp.json()]
    assert months == ["2026-01", "2026-02", "2026-03"]


def test_snapshots_isolated_by_household(client):
    # Register two distinct users / households.
    client.post(
        "/auth/register",
        json={"email": "alpha@x.com", "password": "longenough", "full_name": "Alpha"},
    )
    a = client.post("/auth/login", json={"email": "alpha@x.com", "password": "longenough"}).json()["access_token"]

    client.post(
        "/auth/register",
        json={"email": "beta@x.com", "password": "longenough", "full_name": "Beta"},
    )
    b = client.post("/auth/login", json={"email": "beta@x.com", "password": "longenough"}).json()["access_token"]

    client.post("/wealth/snapshots", json=_snapshot(net=999), headers={"Authorization": f"Bearer {a}"})

    resp_a = client.get("/wealth/snapshots", headers={"Authorization": f"Bearer {a}"})
    resp_b = client.get("/wealth/snapshots", headers={"Authorization": f"Bearer {b}"})
    assert len(resp_a.json()) == 1
    assert resp_b.json() == []


def test_snapshots_require_auth(client):
    resp = client.get("/wealth/snapshots")
    assert resp.status_code == 401
