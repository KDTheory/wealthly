"""Bank connection flow — fully mocked GoCardless service."""
from datetime import datetime, timedelta

import pytest

from app.services import gocardless as gc


@pytest.fixture()
def gc_configured(monkeypatch):
    """Pretend GoCardless creds are set, regardless of env."""
    monkeypatch.setattr(gc, "is_configured", lambda: True)
    yield


@pytest.fixture()
def gc_mock(monkeypatch, gc_configured):
    """Stub every GoCardless network call. Tests can mutate `state` to
    drive different scenarios."""
    state: dict = {
        "institutions": [
            {"id": "BNP_BNPAFRPP", "name": "BNP Paribas", "logo": "https://x/bnp.png"},
            {"id": "REVOLUT_REVOFRPP", "name": "Revolut", "logo": "https://x/r.png"},
        ],
        "agreement_id": "agr-1",
        "requisition_id": "req-1",
        "requisition_link": "https://gocardless/auth/abc",
        "requisition_status": "CR",
        "external_accounts": [],
        "account_details": {},  # ext_id -> details dict
        "transactions_by_account": {},  # ext_id -> list of raw tx dicts
        "calls": [],
    }

    def fake_list_institutions(country="FR"):
        state["calls"].append(("list_institutions", country))
        return state["institutions"]

    def fake_get_institution(institution_id):
        state["calls"].append(("get_institution", institution_id))
        for i in state["institutions"]:
            if i["id"] == institution_id:
                return i
        return {"id": institution_id, "name": institution_id, "logo": None}

    def fake_create_agreement(institution_id, **kw):
        state["calls"].append(("create_agreement", institution_id))
        return {"id": state["agreement_id"]}

    def fake_create_requisition(institution_id, redirect_uri, reference, agreement_id=None, **kw):
        state["calls"].append(("create_requisition", institution_id, reference))
        return {
            "id": state["requisition_id"],
            "link": state["requisition_link"],
            "status": state["requisition_status"],
        }

    def fake_get_requisition(requisition_id):
        state["calls"].append(("get_requisition", requisition_id))
        return {
            "id": requisition_id,
            "status": state["requisition_status"],
            "accounts": list(state["external_accounts"]),
        }

    def fake_get_account_details(ext_id):
        return {"account": state["account_details"].get(ext_id, {})}

    def fake_get_transactions(ext_id, date_from=None, date_to=None):
        return {"transactions": {"booked": list(state["transactions_by_account"].get(ext_id, [])), "pending": []}}

    def fake_delete_requisition(requisition_id):
        state["calls"].append(("delete_requisition", requisition_id))

    monkeypatch.setattr(gc, "list_institutions", fake_list_institutions)
    monkeypatch.setattr(gc, "get_institution", fake_get_institution)
    monkeypatch.setattr(gc, "create_agreement", fake_create_agreement)
    monkeypatch.setattr(gc, "create_requisition", fake_create_requisition)
    monkeypatch.setattr(gc, "get_requisition", fake_get_requisition)
    monkeypatch.setattr(gc, "get_account_details", fake_get_account_details)
    monkeypatch.setattr(gc, "get_transactions", fake_get_transactions)
    monkeypatch.setattr(gc, "delete_requisition", fake_delete_requisition)

    return state


# ---------------------------------------------------------------------------
# Configuration / permissions
# ---------------------------------------------------------------------------

def test_institutions_503_when_not_configured(client, auth_headers, monkeypatch):
    monkeypatch.setattr(gc, "is_configured", lambda: False)
    r = client.get("/banks/institutions", headers=auth_headers)
    assert r.status_code == 503


def test_institutions_returns_list(client, auth_headers, gc_mock):
    r = client.get("/banks/institutions?country=FR", headers=auth_headers)
    assert r.status_code == 200, r.text
    data = r.json()
    assert {i["id"] for i in data} == {"BNP_BNPAFRPP", "REVOLUT_REVOFRPP"}


def test_non_admin_blocked(client, gc_mock):
    """A second user in a separate household defaults to admin (own household).
    Build a non-admin scenario by creating a member-only situation: register a
    user, then call as if they had is_admin=False."""
    # Register and demote
    r = client.post("/auth/register", json={
        "email": "carol@example.com", "password": "longpassword", "full_name": "Carol"
    })
    token = r.json()["access_token"]

    # Demote via DB
    from app.main import app
    from app.database import get_db
    db = next(app.dependency_overrides[get_db]())
    from app.models import User
    user = db.query(User).filter(User.email == "carol@example.com").first()
    user.is_admin = False
    db.commit()

    headers = {"Authorization": f"Bearer {token}"}
    r = client.post("/banks/connect", json={"institution_id": "BNP_BNPAFRPP"}, headers=headers)
    assert r.status_code == 403


# ---------------------------------------------------------------------------
# Connect → callback → map → sync happy path
# ---------------------------------------------------------------------------

def test_full_connect_callback_map_sync(client, auth_headers, gc_mock):
    # 1. Connect
    r = client.post("/banks/connect", json={"institution_id": "BNP_BNPAFRPP"}, headers=auth_headers)
    assert r.status_code == 201, r.text
    payload = r.json()
    assert payload["redirect_url"] == "https://gocardless/auth/abc"
    connection_id = payload["connection_id"]

    # 2. Find the reference (set on the connection)
    r = client.get("/banks/connections", headers=auth_headers)
    conns = r.json()
    assert len(conns) == 1
    conn = conns[0]
    assert conn["status"] == "CR"
    assert conn["institution_name"] == "BNP Paribas"

    # We need the reference — read it from the DB since the API doesn't expose it
    from app.main import app
    from app.database import get_db
    from app.models import BankConnection
    db = next(app.dependency_overrides[get_db]())
    db_conn = db.query(BankConnection).filter(BankConnection.id == connection_id).first()
    reference = db_conn.reference

    # 3. Simulate the user finishing auth on the bank side → callback
    gc_mock["requisition_status"] = "LN"
    gc_mock["external_accounts"] = ["ext-acc-1", "ext-acc-2"]
    gc_mock["account_details"] = {
        "ext-acc-1": {"iban": "FR76 1234 5678 9012 3456 7890 123", "currency": "EUR", "name": "Compte Courant"},
        "ext-acc-2": {"iban": "FR76 9876 5432 1098 7654 3210 987", "currency": "EUR", "name": "Livret A"},
    }

    r = client.get(f"/banks/callback?ref={reference}", headers=auth_headers)
    assert r.status_code == 200, r.text
    cb = r.json()
    assert cb["status"] == "LN"
    assert len(cb["accounts"]) == 2
    assert cb["accounts"][0]["iban"].startswith("FR76")
    assert " " not in cb["accounts"][0]["iban"]  # IBAN normalized

    # 4. Map: link ext-acc-1 to a new internal account, ignore ext-acc-2
    gc_mock["transactions_by_account"]["ext-acc-1"] = [
        {
            "transactionId": "tx-1",
            "bookingDate": "2026-04-01",
            "transactionAmount": {"amount": "-12.50", "currency": "EUR"},
            "remittanceInformationUnstructured": "CARREFOUR PARIS 11",
        },
        {
            "transactionId": "tx-2",
            "bookingDate": "2026-04-02",
            "transactionAmount": {"amount": "2500.00", "currency": "EUR"},
            "remittanceInformationUnstructured": "VIREMENT SALAIRE EMPLOYEUR",
            "creditorName": "ACME SARL",
        },
    ]

    r = client.post(
        f"/banks/connections/{connection_id}/map",
        json={"mappings": [
            {"external_account_id": "ext-acc-1", "new_account_name": "BNP Courant", "new_account_type": "checking"},
        ]},
        headers=auth_headers,
    )
    assert r.status_code == 200, r.text
    mapped = r.json()
    assert mapped["status"] == "LN"
    # First sync was triggered by /map → check transactions exist
    linked = [l for l in mapped["account_links"] if l["external_account_id"] == "ext-acc-1"][0]
    assert linked["account_id"] is not None
    new_account_id = linked["account_id"]

    r = client.get(f"/transactions?account_id={new_account_id}", headers=auth_headers)
    txs = r.json()
    assert len(txs) == 2
    # Categorization regex pass should have hit "groceries" for Carrefour
    carrefour = [t for t in txs if "CARREFOUR" in t["label"]][0]
    assert carrefour["category_slug"] == "groceries"
    salary = [t for t in txs if "SALAIRE" in t["label"]][0]
    assert salary["category_slug"] == "salary"


def test_sync_dedups_on_external_id(client, auth_headers, gc_mock):
    # Bootstrap a fully-mapped connection
    r = client.post("/banks/connect", json={"institution_id": "REVOLUT_REVOFRPP"}, headers=auth_headers)
    connection_id = r.json()["connection_id"]
    from app.main import app
    from app.database import get_db
    from app.models import BankConnection
    db = next(app.dependency_overrides[get_db]())
    reference = db.query(BankConnection).filter(BankConnection.id == connection_id).first().reference

    gc_mock["requisition_status"] = "LN"
    gc_mock["external_accounts"] = ["ext-1"]
    gc_mock["account_details"] = {"ext-1": {"iban": "FR76", "currency": "EUR", "name": "Revolut"}}

    client.get(f"/banks/callback?ref={reference}", headers=auth_headers)

    gc_mock["transactions_by_account"]["ext-1"] = [
        {"transactionId": "stable-1", "bookingDate": "2026-04-01",
         "transactionAmount": {"amount": "-10.00", "currency": "EUR"},
         "remittanceInformationUnstructured": "TEST"},
    ]
    r = client.post(
        f"/banks/connections/{connection_id}/map",
        json={"mappings": [{"external_account_id": "ext-1", "new_account_name": "Revolut"}]},
        headers=auth_headers,
    )
    first_account_id = [l for l in r.json()["account_links"]][0]["account_id"]
    txs1 = client.get(f"/transactions?account_id={first_account_id}", headers=auth_headers).json()
    assert len(txs1) == 1

    # Second sync — same transaction returned. Should be skipped.
    r2 = client.post(f"/banks/connections/{connection_id}/sync", headers=auth_headers)
    assert r2.status_code == 200, r2.text
    summary = r2.json()
    assert summary["inserted"] == 0
    assert summary["skipped"] >= 1

    txs2 = client.get(f"/transactions?account_id={first_account_id}", headers=auth_headers).json()
    assert len(txs2) == 1


def test_sync_refused_when_not_linked(client, auth_headers, gc_mock):
    r = client.post("/banks/connect", json={"institution_id": "BNP_BNPAFRPP"}, headers=auth_headers)
    connection_id = r.json()["connection_id"]
    # Status stays CR (the user never finished auth)
    r = client.post(f"/banks/connections/{connection_id}/sync", headers=auth_headers)
    assert r.status_code == 409


def test_delete_connection_keeps_transactions(client, auth_headers, gc_mock):
    # Set up a synced connection with one transaction
    r = client.post("/banks/connect", json={"institution_id": "BNP_BNPAFRPP"}, headers=auth_headers)
    connection_id = r.json()["connection_id"]
    from app.main import app
    from app.database import get_db
    from app.models import BankConnection
    db = next(app.dependency_overrides[get_db]())
    reference = db.query(BankConnection).filter(BankConnection.id == connection_id).first().reference

    gc_mock["requisition_status"] = "LN"
    gc_mock["external_accounts"] = ["ext-x"]
    gc_mock["account_details"] = {"ext-x": {"iban": "FR76", "currency": "EUR", "name": "X"}}
    gc_mock["transactions_by_account"]["ext-x"] = [
        {"transactionId": "k", "bookingDate": "2026-04-01",
         "transactionAmount": {"amount": "1.00", "currency": "EUR"},
         "remittanceInformationUnstructured": "K"},
    ]
    client.get(f"/banks/callback?ref={reference}", headers=auth_headers)
    r = client.post(
        f"/banks/connections/{connection_id}/map",
        json={"mappings": [{"external_account_id": "ext-x", "new_account_name": "X"}]},
        headers=auth_headers,
    )
    account_id = r.json()["account_links"][0]["account_id"]

    r = client.delete(f"/banks/connections/{connection_id}", headers=auth_headers)
    assert r.status_code == 204

    # Connection gone
    assert client.get("/banks/connections", headers=auth_headers).json() == []
    # Transaction kept (the bank account itself stays — only the link was nulled)
    txs = client.get(f"/transactions?account_id={account_id}", headers=auth_headers).json()
    assert len(txs) == 1


def test_sync_all_noop_when_not_configured(client, auth_headers, monkeypatch):
    monkeypatch.setattr(gc, "is_configured", lambda: False)
    r = client.post("/banks/sync-all", headers=auth_headers)
    assert r.status_code == 200
    assert r.json()["inserted"] == 0
