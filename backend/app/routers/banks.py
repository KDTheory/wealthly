"""
Bank connection endpoints — GoCardless Bank Account Data integration.

Flow (admin only):
  1. GET  /banks/institutions?country=FR              List FR banks
  2. POST /banks/connect {institution_id}             Create requisition + agreement,
                                                       return redirect URL
  3. GET  /banks/callback?ref=…                       After bank auth, fetch accounts
                                                       and return them for mapping
  4. POST /banks/connections/{id}/map [...mappings]   Persist external↔internal mapping,
                                                       trigger first sync
  5. POST /banks/connections/{id}/sync                Manual re-sync
  6. GET  /banks/connections                          List with status + expiry
  7. DELETE /banks/connections/{id}                   Revoke + drop links
                                                       (transactions are kept)

The actual transaction inserts go into the same Transaction table used by the
CSV importer. Dedup is on (account_id, external_id) when external_id is set,
falling back to the existing dedup_hash for safety.
"""
from __future__ import annotations

import hashlib
import logging
import re
import uuid
from datetime import datetime, timedelta, timezone, date as date_type
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.config import settings
from app.database import get_db
from app.models import (
    Account,
    BankAccountLink,
    BankConnection,
    CategorisationRule,
    Category,
    Member,
    Transaction,
    User,
)
from app.routers.categorize import _DEFAULT_RULES
from app.routers.transactions import _make_dedup_hash
from app.services import gocardless as gc

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/banks", tags=["banks"])


# ---------------------------------------------------------------------------
# Schemas
# ---------------------------------------------------------------------------

class InstitutionOut(BaseModel):
    id: str
    name: str
    bic: Optional[str] = None
    logo: Optional[str] = None
    transaction_total_days: Optional[str] = None


class ConnectRequest(BaseModel):
    institution_id: str


class ConnectResponse(BaseModel):
    connection_id: str
    redirect_url: str


class ExternalAccountOut(BaseModel):
    """One remote account exposed by the bank, ready to be mapped."""
    external_account_id: str
    iban: Optional[str] = None
    currency: Optional[str] = "EUR"
    owner_name: Optional[str] = None
    display_name: Optional[str] = None
    suggested_account_id: Optional[str] = None  # best-effort match in existing accounts


class CallbackResponse(BaseModel):
    connection_id: str
    status: str
    institution_name: str
    institution_logo: Optional[str] = None
    accounts: list[ExternalAccountOut]


class AccountMapping(BaseModel):
    external_account_id: str
    # Either link to an existing account…
    account_id: Optional[str] = None
    # …or create a new internal Account on the fly.
    new_account_name: Optional[str] = None
    new_account_type: Optional[str] = "checking"
    new_account_member_ids: Optional[list[str]] = None


class MapRequest(BaseModel):
    mappings: list[AccountMapping] = Field(default_factory=list)


class SyncSummary(BaseModel):
    inserted: int
    skipped: int
    accounts_synced: int
    error: Optional[str] = None


class BankAccountLinkOut(BaseModel):
    id: str
    external_account_id: str
    iban: Optional[str] = None
    currency: Optional[str] = None
    owner_name: Optional[str] = None
    display_name: Optional[str] = None
    account_id: Optional[str] = None
    last_synced_at: Optional[datetime] = None


class BankConnectionOut(BaseModel):
    id: str
    provider: str
    institution_id: str
    institution_name: str
    institution_logo: Optional[str] = None
    status: str
    status_label: str
    created_at: datetime
    expires_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    last_sync_error: Optional[str] = None
    days_until_expiry: Optional[int] = None
    account_links: list[BankAccountLinkOut]


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _require_admin(user: User) -> None:
    if not user.is_admin:
        raise HTTPException(
            status_code=http_status.HTTP_403_FORBIDDEN,
            detail="Action réservée à l'administrateur du foyer",
        )


def _require_configured() -> None:
    if not gc.is_configured():
        raise HTTPException(
            status_code=http_status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=(
                "Connexions bancaires non configurées. "
                "Renseigne GOCARDLESS_SECRET_ID et GOCARDLESS_SECRET_KEY côté backend."
            ),
        )


def _serialize_link(link: BankAccountLink) -> BankAccountLinkOut:
    return BankAccountLinkOut(
        id=link.id,
        external_account_id=link.external_account_id,
        iban=link.iban,
        currency=link.currency,
        owner_name=link.owner_name,
        display_name=link.display_name,
        account_id=link.account_id,
        last_synced_at=link.last_synced_at,
    )


def _serialize_connection(conn: BankConnection) -> BankConnectionOut:
    days_until_expiry = None
    if conn.expires_at:
        # expires_at stored as naive UTC; treat as UTC for delta
        delta = conn.expires_at - datetime.utcnow()
        days_until_expiry = max(0, delta.days)
    return BankConnectionOut(
        id=conn.id,
        provider=conn.provider,
        institution_id=conn.institution_id,
        institution_name=conn.institution_name,
        institution_logo=conn.institution_logo,
        status=conn.status,
        status_label=gc.STATUS_LABELS.get(conn.status, conn.status),
        created_at=conn.created_at,
        expires_at=conn.expires_at,
        last_sync_at=conn.last_sync_at,
        last_sync_error=conn.last_sync_error,
        days_until_expiry=days_until_expiry,
        account_links=[_serialize_link(l) for l in conn.account_links],
    )


def _normalize_iban(iban: Optional[str]) -> Optional[str]:
    if not iban:
        return None
    return iban.replace(" ", "").upper()


def _suggest_account_match(
    db: Session,
    household_id: str,
    iban: Optional[str],
    display_name: Optional[str],
    bank_name: str,
) -> Optional[str]:
    """Best-effort: match a remote account to an existing internal one.

    We don't store IBANs today, so the match relies on (bank, name) — exact
    case-insensitive match on bank field + fuzzy substring on name.
    """
    accounts = db.query(Account).filter(Account.household_id == household_id).all()
    if not accounts:
        return None
    target_name = (display_name or "").lower().strip()
    target_bank = bank_name.lower().strip()
    # Exact bank + name contains
    for acc in accounts:
        if (acc.bank or "").lower().strip() == target_bank:
            if target_name and target_name in (acc.name or "").lower():
                return acc.id
    # Same bank, single account → assume it's the one
    same_bank = [a for a in accounts if (a.bank or "").lower().strip() == target_bank]
    if len(same_bank) == 1:
        return same_bank[0].id
    return None


def _compute_external_id(account_id: str, raw: dict) -> str:
    """Stable identifier for a transaction, used to dedup syncs.

    GoCardless sometimes returns transactionId (preferred) or internalTransactionId
    (Sandbox / some banks). When neither is present we fall back to a hash of
    the immutable fields — this is the failure case to log.
    """
    tx_id = raw.get("transactionId") or raw.get("internalTransactionId")
    if tx_id:
        return str(tx_id)
    booking = raw.get("bookingDate") or raw.get("valueDate") or ""
    amount = ((raw.get("transactionAmount") or {}).get("amount")) or ""
    info = raw.get("remittanceInformationUnstructured") or " ".join(
        raw.get("remittanceInformationUnstructuredArray") or []
    ) or raw.get("creditorName") or raw.get("debtorName") or ""
    base = f"{account_id}|{booking}|{amount}|{info[:80]}"
    return "h:" + hashlib.sha1(base.encode("utf-8")).hexdigest()[:24]


def _extract_label(raw: dict) -> str:
    parts: list[str] = []
    info = raw.get("remittanceInformationUnstructured")
    if not info:
        arr = raw.get("remittanceInformationUnstructuredArray") or []
        info = " ".join(arr) if arr else None
    if info:
        parts.append(info.strip())
    name = raw.get("creditorName") or raw.get("debtorName")
    if name and (not parts or name.strip().lower() not in parts[0].lower()):
        parts.append(name.strip())
    return (" — ".join(parts) or "Transaction")[:240]


def _extract_date(raw: dict) -> Optional[date_type]:
    for key in ("bookingDate", "valueDate", "bookingDateTime", "valueDateTime"):
        val = raw.get(key)
        if val:
            try:
                return datetime.fromisoformat(val.replace("Z", "+00:00")).date()
            except ValueError:
                continue
    return None


def _extract_amount(raw: dict) -> Optional[float]:
    amt = (raw.get("transactionAmount") or {}).get("amount")
    if amt is None:
        return None
    try:
        return float(amt)
    except (TypeError, ValueError):
        return None


def _quick_categorize(label: str, valid_slugs: set[str], custom_rules: list[CategorisationRule]) -> Optional[str]:
    """Regex pass only — same logic as /categorize but skips the AI call to keep
    the sync cheap and synchronous. Users can re-categorize from the UI."""
    for pattern, slug in _DEFAULT_RULES:
        try:
            if re.search(pattern, label, re.IGNORECASE) and slug in valid_slugs:
                return slug
        except re.error:
            continue
    for rule in custom_rules:
        try:
            if re.search(rule.pattern, label, re.IGNORECASE) and rule.category_slug in valid_slugs:
                return rule.category_slug
        except re.error:
            continue
    return None


def _sync_connection(db: Session, conn: BankConnection) -> SyncSummary:
    """Pull transactions for every mapped link in a connection.

    Skips links with no `account_id` (user hasn't completed mapping). Updates
    status / last_sync_* on the connection. Never raises — errors are stored
    on `last_sync_error` so the UI can surface them.
    """
    mapped = [l for l in conn.account_links if l.account_id]
    if not mapped:
        conn.last_sync_at = datetime.utcnow()
        conn.last_sync_error = None
        db.commit()
        return SyncSummary(inserted=0, skipped=0, accounts_synced=0)

    # Pre-fetch reference data once
    valid_slugs = {
        c.slug for c in db.query(Category).filter(Category.household_id == conn.household_id).all()
    }
    custom_rules = list(
        db.query(CategorisationRule).filter(CategorisationRule.household_id == conn.household_id).all()
    )

    inserted = 0
    skipped = 0
    accounts_synced = 0
    errors: list[str] = []

    for link in mapped:
        try:
            # On first sync we pull the full granted window; otherwise the last
            # 14 days are plenty (booked transactions can backdate by a few days).
            if link.last_synced_at:
                date_from = (link.last_synced_at - timedelta(days=14)).date().isoformat()
            else:
                date_from = (datetime.utcnow() - timedelta(days=settings.GOCARDLESS_HISTORICAL_DAYS)).date().isoformat()
            payload = gc.get_transactions(link.external_account_id, date_from=date_from)
        except gc.GoCardlessError as e:
            errors.append(f"{link.display_name or link.external_account_id}: {e}")
            continue

        booked = ((payload or {}).get("transactions") or {}).get("booked") or []
        # Pre-fetch existing external_ids for this account to dedup cheaply
        existing = set(
            x for (x,) in db.query(Transaction.external_id).filter(
                Transaction.account_id == link.account_id,
                Transaction.external_id.isnot(None),
            ).all()
        )

        for raw in booked:
            ext_id = _compute_external_id(link.external_account_id, raw)
            if ext_id in existing:
                skipped += 1
                continue
            tx_date = _extract_date(raw)
            amount = _extract_amount(raw)
            if tx_date is None or amount is None:
                skipped += 1
                continue
            label = _extract_label(raw)
            slug = _quick_categorize(label, valid_slugs, custom_rules)
            cat_id = None
            if slug:
                cat = db.query(Category).filter(
                    Category.household_id == conn.household_id,
                    Category.slug == slug,
                ).first()
                cat_id = cat.id if cat else None
            tx = Transaction(
                household_id=conn.household_id,
                account_id=link.account_id,
                date=tx_date,
                label=label,
                amount=amount,
                category_id=cat_id,
                is_manual_category=False,
                source="gocardless",
                external_id=ext_id,
                dedup_hash=_make_dedup_hash(link.account_id, tx_date, amount, label),
            )
            db.add(tx)
            existing.add(ext_id)
            inserted += 1

        link.last_synced_at = datetime.utcnow()
        accounts_synced += 1

    conn.last_sync_at = datetime.utcnow()
    conn.last_sync_error = "\n".join(errors) if errors else None
    db.commit()

    return SyncSummary(
        inserted=inserted,
        skipped=skipped,
        accounts_synced=accounts_synced,
        error=conn.last_sync_error,
    )


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.get("/institutions", response_model=list[InstitutionOut])
def list_institutions(
    country: str = Query("FR", min_length=2, max_length=2),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    _require_configured()
    try:
        items = gc.list_institutions(country)
    except gc.GoCardlessError as e:
        raise HTTPException(status_code=502, detail=str(e))
    return [
        InstitutionOut(
            id=item["id"],
            name=item["name"],
            bic=item.get("bic"),
            logo=item.get("logo"),
            transaction_total_days=item.get("transaction_total_days"),
        )
        for item in items
    ]


@router.post("/connect", response_model=ConnectResponse, status_code=201)
def create_connection(
    payload: ConnectRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    _require_configured()
    # Pull institution metadata so we can store name + logo upfront
    try:
        inst = gc.get_institution(payload.institution_id)
        agreement = gc.create_agreement(payload.institution_id)
        reference = f"hh-{user.household_id}-{uuid.uuid4().hex[:12]}"
        req = gc.create_requisition(
            institution_id=payload.institution_id,
            redirect_uri=settings.GOCARDLESS_REDIRECT_URI,
            reference=reference,
            agreement_id=agreement.get("id"),
        )
    except gc.GoCardlessError as e:
        logger.exception("[banks] connect failed")
        raise HTTPException(status_code=502, detail=str(e))

    expires_at = datetime.utcnow() + timedelta(days=settings.GOCARDLESS_ACCESS_VALID_DAYS)
    conn = BankConnection(
        household_id=user.household_id,
        provider="gocardless",
        institution_id=payload.institution_id,
        institution_name=inst.get("name") or payload.institution_id,
        institution_logo=inst.get("logo"),
        requisition_id=req["id"],
        agreement_id=agreement.get("id"),
        reference=reference,
        status=req.get("status", "CR"),
        expires_at=expires_at,
    )
    db.add(conn)
    db.commit()
    db.refresh(conn)

    return ConnectResponse(connection_id=conn.id, redirect_url=req["link"])


@router.get("/callback", response_model=CallbackResponse)
def handle_callback(
    ref: str = Query(..., description="The reference passed to GoCardless"),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Called by the frontend after the bank redirects the user back.

    Looks up the connection by `reference`, polls GoCardless for the
    requisition status, persists the discovered accounts, and returns them
    so the frontend can render a mapping screen.
    """
    _require_admin(user)
    _require_configured()
    conn = db.query(BankConnection).filter(
        BankConnection.household_id == user.household_id,
        BankConnection.reference == ref,
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connexion introuvable")

    try:
        req = gc.get_requisition(conn.requisition_id)
    except gc.GoCardlessError as e:
        raise HTTPException(status_code=502, detail=str(e))

    conn.status = req.get("status", conn.status)
    external_ids: list[str] = req.get("accounts") or []

    # Upsert account links from the requisition's accounts list
    existing_links = {l.external_account_id: l for l in conn.account_links}
    out_accounts: list[ExternalAccountOut] = []
    for ext_id in external_ids:
        try:
            details_wrap = gc.get_account_details(ext_id)
            details = details_wrap.get("account") or {}
        except gc.GoCardlessError:
            details = {}
        iban = _normalize_iban(details.get("iban"))
        currency = details.get("currency") or "EUR"
        owner = details.get("ownerName") or details.get("name")
        display = details.get("name") or details.get("product") or details.get("cashAccountType")

        link = existing_links.get(ext_id)
        if link is None:
            link = BankAccountLink(
                connection_id=conn.id,
                external_account_id=ext_id,
            )
            db.add(link)
        link.iban = iban
        link.currency = currency
        link.owner_name = owner
        link.display_name = display

        suggested = _suggest_account_match(
            db, conn.household_id, iban, display, conn.institution_name
        )
        out_accounts.append(
            ExternalAccountOut(
                external_account_id=ext_id,
                iban=iban,
                currency=currency,
                owner_name=owner,
                display_name=display,
                suggested_account_id=suggested,
            )
        )

    db.commit()
    db.refresh(conn)

    return CallbackResponse(
        connection_id=conn.id,
        status=conn.status,
        institution_name=conn.institution_name,
        institution_logo=conn.institution_logo,
        accounts=out_accounts,
    )


@router.post("/connections/{connection_id}/map", response_model=BankConnectionOut)
def map_accounts(
    connection_id: str,
    payload: MapRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    conn = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.household_id == user.household_id,
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connexion introuvable")

    links_by_ext = {l.external_account_id: l for l in conn.account_links}

    for m in payload.mappings:
        link = links_by_ext.get(m.external_account_id)
        if not link:
            continue
        if m.account_id:
            acc = db.query(Account).filter(
                Account.id == m.account_id,
                Account.household_id == user.household_id,
            ).first()
            if not acc:
                raise HTTPException(status_code=400, detail=f"Compte interne inconnu: {m.account_id}")
            link.account_id = acc.id
        elif m.new_account_name:
            new_acc = Account(
                household_id=user.household_id,
                name=m.new_account_name,
                bank=conn.institution_name,
                type=m.new_account_type or "checking",
                initial_balance=0.0,
            )
            if m.new_account_member_ids:
                members = db.query(Member).filter(
                    Member.id.in_(m.new_account_member_ids),
                    Member.household_id == user.household_id,
                ).all()
                new_acc.members = members
            db.add(new_acc)
            db.flush()
            link.account_id = new_acc.id
        else:
            link.account_id = None  # explicitly unmapped

    db.commit()
    db.refresh(conn)

    # Trigger an immediate first sync (best-effort, errors stored on conn)
    _sync_connection(db, conn)
    db.refresh(conn)

    return _serialize_connection(conn)


@router.post("/connections/{connection_id}/sync", response_model=SyncSummary)
def sync_connection(
    connection_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    _require_admin(user)
    _require_configured()
    conn = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.household_id == user.household_id,
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connexion introuvable")
    if conn.status != "LN":
        # Try to refresh status from provider before failing
        try:
            req = gc.get_requisition(conn.requisition_id)
            conn.status = req.get("status", conn.status)
            db.commit()
        except gc.GoCardlessError:
            pass
    if conn.status != "LN":
        raise HTTPException(
            status_code=409,
            detail=f"Connexion non liée (statut {gc.STATUS_LABELS.get(conn.status, conn.status)}). "
                   "Reliez la banque depuis Réglages.",
        )
    return _sync_connection(db, conn)


@router.post("/sync-all", response_model=SyncSummary)
def sync_all(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Sync every linked connection in one call. Used by the frontend on login
    to refresh transactions silently (debounced client-side to once per day).
    """
    _require_admin(user)
    if not gc.is_configured():
        # Quietly noop — frontend calls this on every login, configuration
        # missing isn't an error to surface.
        return SyncSummary(inserted=0, skipped=0, accounts_synced=0)
    conns = db.query(BankConnection).filter(
        BankConnection.household_id == user.household_id,
        BankConnection.status == "LN",
    ).all()
    total = SyncSummary(inserted=0, skipped=0, accounts_synced=0)
    errs: list[str] = []
    for conn in conns:
        s = _sync_connection(db, conn)
        total = SyncSummary(
            inserted=total.inserted + s.inserted,
            skipped=total.skipped + s.skipped,
            accounts_synced=total.accounts_synced + s.accounts_synced,
        )
        if s.error:
            errs.append(f"{conn.institution_name}: {s.error}")
    if errs:
        total = SyncSummary(
            inserted=total.inserted,
            skipped=total.skipped,
            accounts_synced=total.accounts_synced,
            error="\n".join(errs),
        )
    return total


@router.get("/connections", response_model=list[BankConnectionOut])
def list_connections(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Available to all household users so they can see connections, but
    only admins can create/sync/delete (enforced on those endpoints).
    """
    conns = db.query(BankConnection).filter(
        BankConnection.household_id == user.household_id,
    ).order_by(BankConnection.created_at.desc()).all()
    return [_serialize_connection(c) for c in conns]


@router.delete("/connections/{connection_id}", status_code=204)
def delete_connection(
    connection_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Remove a bank connection. The historical transactions are kept (they're
    real money movements) but stop being refreshed."""
    _require_admin(user)
    conn = db.query(BankConnection).filter(
        BankConnection.id == connection_id,
        BankConnection.household_id == user.household_id,
    ).first()
    if not conn:
        raise HTTPException(status_code=404, detail="Connexion introuvable")
    if gc.is_configured():
        try:
            gc.delete_requisition(conn.requisition_id)
        except gc.GoCardlessError:
            # Already revoked / expired upstream — proceed with local delete
            pass
    db.delete(conn)
    db.commit()
