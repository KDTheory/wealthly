"""
Enable Banking router — automatic bank sync via open banking.

Endpoints:
  GET  /banking/banks              List available banks (ASPSPs) for a country
  POST /banking/connect            Initiate connection → returns redirect URL for user
  POST /banking/complete           Complete connection after bank OAuth callback
  POST /banking/sync/{id}          Sync latest transactions for a connection
  GET  /banking/connections        List all connections for the household
  DELETE /banking/connections/{id} Remove a bank connection

Flow:
  1. Frontend calls GET /banking/banks to show bank list
  2. User picks a bank → frontend calls POST /banking/connect
  3. Backend creates EB session → returns {redirect_url, connection_id, state}
  4. Frontend redirects user to redirect_url (bank login page)
  5. Bank redirects back to Vercel URL with ?state=xxx
  6. Frontend detects ?state param → calls POST /banking/complete {state}
  7. Backend checks EB session, fetches accounts, updates connection status
  8. Frontend calls POST /banking/sync/{id} to import transactions
"""
import os
import time
import uuid
import base64
import logging
from datetime import datetime, timedelta
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Body
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import BankConnection, Transaction, Account, User
from app.auth import get_current_user

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/banking", tags=["banking"])

# ============================================================================
# JWT HELPER
# ============================================================================

def _load_private_key() -> str:
    """Load Enable Banking RSA private key.

    Priority:
    1. ENABLE_BANKING_PRIVATE_KEY_B64 env var (base64-encoded, for production)
    2. enablebanking_private.pem file next to backend/ (local dev)
    """
    if settings.ENABLE_BANKING_PRIVATE_KEY_B64:
        return base64.b64decode(settings.ENABLE_BANKING_PRIVATE_KEY_B64).decode("utf-8")

    # Fallback: PEM file in backend root
    pem_path = os.path.join(
        os.path.dirname(__file__), "..", "..", "enablebanking_private.pem"
    )
    pem_path = os.path.normpath(pem_path)
    if os.path.exists(pem_path):
        with open(pem_path, "r") as f:
            return f.read()

    raise RuntimeError(
        "Enable Banking private key not found. "
        "Set ENABLE_BANKING_PRIVATE_KEY_B64 env var or place enablebanking_private.pem in backend/"
    )


def _create_eb_jwt() -> str:
    """Generate a signed RS256 JWT for Enable Banking API authentication."""
    from jose import jwt as jose_jwt

    if not settings.ENABLE_BANKING_APP_ID:
        raise RuntimeError("ENABLE_BANKING_APP_ID env var is not set")

    private_key = _load_private_key()
    now = int(time.time())

    payload = {
        "iss": "enablebanking.com",
        "aud": "api.enablebanking.com",
        "iat": now,
        "exp": now + 3600,
    }

    token = jose_jwt.encode(
        payload,
        private_key,
        algorithm="RS256",
        headers={"kid": settings.ENABLE_BANKING_APP_ID},
    )
    return token


# ============================================================================
# ENABLE BANKING HTTP CLIENT
# ============================================================================

async def _eb(method: str, path: str, body: dict = None) -> dict:
    """Authenticated async request to the Enable Banking API."""
    try:
        token = _create_eb_jwt()
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    url = f"{settings.ENABLE_BANKING_API_BASE}{path}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    async with httpx.AsyncClient(timeout=30.0) as client:
        if method == "GET":
            resp = await client.get(url, headers=headers)
        elif method == "POST":
            resp = await client.post(url, headers=headers, json=body)
        elif method == "DELETE":
            resp = await client.delete(url, headers=headers)
        else:
            raise ValueError(f"Unknown HTTP method: {method}")

    if resp.status_code == 401:
        raise HTTPException(status_code=502, detail="Enable Banking authentication failed — check APP_ID and private key")
    if resp.status_code == 404:
        raise HTTPException(status_code=404, detail=f"Enable Banking resource not found: {path}")
    if resp.status_code >= 400:
        error_text = resp.text[:500]
        logger.error("Enable Banking API error %s: %s", resp.status_code, error_text)
        raise HTTPException(status_code=502, detail=f"Enable Banking error {resp.status_code}: {error_text}")

    if resp.status_code == 204 or not resp.content:
        return {}

    return resp.json()


# ============================================================================
# PYDANTIC SCHEMAS
# ============================================================================

class ConnectRequest(BaseModel):
    bank_name: str
    bank_country: str = "FR"


class CompleteRequest(BaseModel):
    state: str


# ============================================================================
# ROUTES
# ============================================================================

@router.get("/banks")
async def list_banks(
    country: str = Query("FR", description="ISO 3166-1 alpha-2 country code"),
    current_user: User = Depends(get_current_user),
):
    """List banks available for open banking connection in the given country."""
    data = await _eb("GET", f"/aspsps?country={country}&psu_type=personal")
    # EB returns {"aspsps": [...]} or just a list
    banks = data.get("aspsps", data) if isinstance(data, dict) else data
    return {"banks": banks, "country": country}


@router.post("/connect")
async def connect_bank(
    body: ConnectRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Initiate a bank connection.
    Returns a redirect_url to send the user to for bank authentication.
    """
    state = str(uuid.uuid4())
    valid_until = (datetime.utcnow() + timedelta(days=90)).strftime("%Y-%m-%dT%H:%M:%S.000Z")

    session_body = {
        "access": {"valid_until": valid_until},
        "aspsp": {"name": body.bank_name, "country": body.bank_country},
        "state": state,
        "redirect_url": settings.ENABLE_BANKING_REDIRECT_URI,
        "psu_type": "personal",
    }

    data = await _eb("POST", "/sessions", session_body)
    session_id = data.get("session_id")
    redirect_url = data.get("url")

    if not session_id or not redirect_url:
        raise HTTPException(status_code=502, detail="Enable Banking did not return a valid session")

    conn = BankConnection(
        household_id=current_user.household_id,
        session_id=session_id,
        bank_name=body.bank_name,
        bank_country=body.bank_country,
        status="pending",
        state=state,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)

    return {
        "connection_id": conn.id,
        "redirect_url": redirect_url,
        "state": state,
    }


@router.post("/complete")
async def complete_connection(
    body: CompleteRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Called by frontend after bank redirects back to the app.
    Looks up the connection by `state`, fetches EB session to get accounts.
    """
    conn = db.query(BankConnection).filter(
        BankConnection.state == body.state,
        BankConnection.household_id == current_user.household_id,
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Connexion introuvable (state invalide)")

    if conn.status == "authorized":
        return {"status": "authorized", "connection_id": conn.id, "accounts": conn.accounts_data or []}

    # Fetch session from Enable Banking
    try:
        data = await _eb("GET", f"/sessions/{conn.session_id}")
    except HTTPException as e:
        conn.status = "error"
        conn.error_message = str(e.detail)
        db.commit()
        raise

    # Extract accounts from session
    accounts = data.get("accounts", [])
    session_status = data.get("status", "UNKNOWN")

    if session_status in ("AUTHORIZED", "READY"):
        conn.status = "authorized"
        conn.accounts_data = accounts
    elif session_status in ("FAILED", "REJECTED"):
        conn.status = "error"
        conn.error_message = f"Bank returned status: {session_status}"
    # else still pending

    db.commit()
    db.refresh(conn)

    return {
        "status": conn.status,
        "connection_id": conn.id,
        "accounts": conn.accounts_data or [],
        "session_status": session_status,
    }


@router.post("/sync/{connection_id}")
async def sync_transactions(
    connection_id: str,
    days_back: int = Query(90, description="How many days back to fetch"),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """
    Sync transactions for a connected bank.
    Imports new transactions into the Wealthly accounts (creates accounts if needed).
    Returns counts of imported / skipped transactions.
    """
    conn = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.household_id == current_user.household_id,
    ).first()

    if not conn:
        raise HTTPException(status_code=404, detail="Connexion introuvable")
    if conn.status != "authorized":
        raise HTTPException(status_code=400, detail="La connexion bancaire n'est pas encore autorisée")

    accounts_data = conn.accounts_data or []
    date_from = (datetime.utcnow() - timedelta(days=days_back)).strftime("%Y-%m-%d")
    date_to = datetime.utcnow().strftime("%Y-%m-%d")

    imported = 0
    skipped = 0
    errors = []

    for eb_account in accounts_data:
        # EB account id may be under different keys depending on version
        eb_account_id = (
            eb_account.get("uid")
            or eb_account.get("account_id")
            or eb_account.get("id")
        )
        if not eb_account_id:
            continue

        account_name = (
            eb_account.get("name")
            or eb_account.get("product")
            or f"{conn.bank_name} compte"
        )
        iban = eb_account.get("iban") or eb_account.get("identification", {}).get("iban", "")

        # Find or create the local Account for this EB account
        local_account = db.query(Account).filter(
            Account.household_id == current_user.household_id,
            Account.bank == conn.bank_name,
            Account.name == account_name,
        ).first()

        if not local_account:
            local_account = Account(
                household_id=current_user.household_id,
                name=account_name,
                bank=conn.bank_name,
                type="checking",
                initial_balance=0.0,
            )
            db.add(local_account)
            db.flush()

        # Fetch transactions from EB
        try:
            tx_path = f"/accounts/{eb_account_id}/transactions?date_from={date_from}&date_to={date_to}"
            tx_data = await _eb("GET", tx_path)
            transactions_list = tx_data.get("transactions", [])
        except HTTPException as e:
            errors.append(f"{account_name}: {e.detail}")
            continue

        # Import each transaction
        for tx in transactions_list:
            amount_info = tx.get("transaction_amount") or tx.get("amount") or {}
            if isinstance(amount_info, dict):
                raw_amount = float(amount_info.get("amount", 0))
            else:
                raw_amount = float(amount_info or 0)

            tx_date_str = (
                tx.get("booking_date")
                or tx.get("value_date")
                or tx.get("date")
                or date_from
            )
            try:
                tx_date = datetime.strptime(tx_date_str[:10], "%Y-%m-%d").date()
            except (ValueError, TypeError):
                tx_date = datetime.utcnow().date()

            label = (
                tx.get("remittance_information")
                or tx.get("creditor_name")
                or tx.get("debtor_name")
                or tx.get("description")
                or "Transaction"
            )
            if isinstance(label, list):
                label = " ".join(label)
            label = str(label).strip()[:255]

            # Dedup hash: account_id|date|amount|label[:40]
            dedup_hash = f"{local_account.id}|{tx_date}|{raw_amount}|{label[:40]}"

            existing = db.query(Transaction).filter(
                Transaction.household_id == current_user.household_id,
                Transaction.dedup_hash == dedup_hash,
            ).first()

            if existing:
                skipped += 1
                continue

            new_tx = Transaction(
                household_id=current_user.household_id,
                account_id=local_account.id,
                date=tx_date,
                label=label,
                amount=raw_amount,
                dedup_hash=dedup_hash,
            )
            db.add(new_tx)
            imported += 1

    conn.last_synced_at = datetime.utcnow()
    db.commit()

    return {
        "imported": imported,
        "skipped": skipped,
        "errors": errors,
        "last_synced_at": conn.last_synced_at.isoformat(),
    }


@router.get("/connections")
def list_connections(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """List all bank connections for the current household."""
    conns = db.query(BankConnection).filter(
        BankConnection.household_id == current_user.household_id
    ).order_by(BankConnection.created_at.desc()).all()

    return [
        {
            "id": c.id,
            "bank_name": c.bank_name,
            "bank_country": c.bank_country,
            "status": c.status,
            "accounts": c.accounts_data or [],
            "error_message": c.error_message,
            "last_synced_at": c.last_synced_at.isoformat() if c.last_synced_at else None,
            "created_at": c.created_at.isoformat(),
        }
        for c in conns
    ]


@router.delete("/connections/{connection_id}", status_code=204)
def delete_connection(
    connection_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Remove a bank connection."""
    conn = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.household_id == current_user.household_id,
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connexion introuvable")
    db.delete(conn)
    db.commit()
    return None
