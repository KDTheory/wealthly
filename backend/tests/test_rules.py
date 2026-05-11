"""Custom regex categorization rules."""


def test_list_empty(client, auth_headers):
    resp = client.get("/rules", headers=auth_headers)
    assert resp.status_code == 200
    assert resp.json() == []


def test_create_rule(client, auth_headers):
    resp = client.post(
        "/rules",
        json={"pattern": "boulangerie martin", "category_slug": "groceries"},
        headers=auth_headers,
    )
    assert resp.status_code == 201
    body = resp.json()
    assert body["pattern"] == "boulangerie martin"
    assert body["category_slug"] == "groceries"
    assert body["source"] == "manual"


def test_delete_rule(client, auth_headers):
    create = client.post(
        "/rules",
        json={"pattern": "test pattern", "category_slug": "shopping"},
        headers=auth_headers,
    )
    rule_id = create.json()["id"]
    resp = client.delete(f"/rules/{rule_id}", headers=auth_headers)
    assert resp.status_code == 204

    # Should be gone from the list.
    resp = client.get("/rules", headers=auth_headers)
    assert all(r["id"] != rule_id for r in resp.json())


def test_rules_require_auth(client):
    assert client.get("/rules").status_code == 401
    assert client.post("/rules", json={"pattern": "x", "category_slug": "y"}).status_code == 401
