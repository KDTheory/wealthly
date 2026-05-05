"""
Transactions endpoints: list, create one, bulk import (with deduplication),
update category/notes, delete.
"""
from typing import List, Optional
from datetime import date as date_type
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from sqlalchemy import and_

from app.database import get_db
from app.models import User, Transaction, Account, Category
from app.schemas import (
    TransactionCreate, TransactionUpdate, TransactionOut,
    TransactionImport, TransactionImportResult,
)
from app.auth import get_current_user

router = APIRouter(prefix="/transactions", tags=["transactions"])


def _make_dedup_hash(account_id: str, dt: date_type, amount: float, label: str) -> str:
    """Hash used to deduplicate imports — must match frontend's hashTransaction logic."""
    label_part = (label or "")[:50].lower().strip()
    return f"{account_id}|{dt.isoformat()}|{amount:.2f}|{label_part}"


def _resolve_category_id(db: Session, household_id: str, slug: Optional[str]) -> Optional[str]:
    if not slug:
        return None
    cat = db.query(Category).filter(
        Category.household_id == household_id,
        Category.slug == slug,
    ).first()
    return cat.id if cat else None


def _to_out(tx: Transaction, db: Session) -> dict:
    cat_slug = None
    if tx.category_id:
        cat = db.query(Category).filter(Category.id == tx.category_id).first()
        cat_slug = cat.slug if cat else None
    return {
        "id": tx.id,
        "account_id": tx.account_id,
        "date": tx.date,
        "label": tx.label,
        "amount": tx.amount,
        "category_slug": cat_slug,
        "is_manual_category": tx.is_manual_category,
        "is_recurring_override": tx.is_recurring_override,
        "notes": tx.notes or "",
        "household_id": tx.household_id,
    }


@router.get("", response_model=List[TransactionOut])
def list_transactions(
    account_id: Optional[str] = Query(None),
    limit: int = Query(5000, ge=1, le=20000),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """Return all transactions for the current household, optionally filtered by account."""
    q = db.query(Transaction).filter(Transaction.household_id == user.household_id)
    if account_id:
        q = q.filter(Transaction.account_id == account_id)
    txs = q.order_by(Transaction.date.desc()).limit(limit).all()
    return [_to_out(t, db) for t in txs]


@router.post("", response_model=TransactionOut, status_code=201)
def create_transaction(payload: TransactionCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Add a single transaction (manual entry)."""
    # Verify account belongs to user's household
    acc = db.query(Account).filter(
        Account.id == payload.account_id,
        Account.household_id == user.household_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=400, detail="Compte invalide")

    cat_id = _resolve_category_id(db, user.household_id, payload.category_slug)
    dedup = _make_dedup_hash(payload.account_id, payload.date, payload.amount, payload.label)

    # Reject duplicates
    existing = db.query(Transaction).filter(
        Transaction.household_id == user.household_id,
        Transaction.dedup_hash == dedup,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Transaction déjà existante (doublon)")

    tx = Transaction(
        household_id=user.household_id,
        account_id=payload.account_id,
        date=payload.date,
        label=payload.label,
        amount=payload.amount,
        category_id=cat_id,
        is_manual_category=payload.is_manual_category,
        is_recurring_override=payload.is_recurring_override,
        notes=payload.notes or "",
        dedup_hash=dedup,
    )
    db.add(tx)
    db.commit()
    db.refresh(tx)
    return _to_out(tx, db)


@router.post("/import", response_model=TransactionImportResult, status_code=201)
def bulk_import(payload: TransactionImport, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Import a batch of transactions. Skips duplicates (same account+date+amount+label).
    This is what the React frontend calls after parsing a CSV."""
    acc = db.query(Account).filter(
        Account.id == payload.account_id,
        Account.household_id == user.household_id,
    ).first()
    if not acc:
        raise HTTPException(status_code=400, detail="Compte invalide")

    # Pre-fetch existing dedup hashes to avoid N+1 queries
    existing_hashes = set(
        h for (h,) in db.query(Transaction.dedup_hash).filter(
            Transaction.household_id == user.household_id,
        ).all()
    )

    inserted = 0
    skipped = 0
    for t in payload.transactions:
        dedup = _make_dedup_hash(payload.account_id, t.date, t.amount, t.label)
        if dedup in existing_hashes:
            skipped += 1
            continue
        cat_id = _resolve_category_id(db, user.household_id, t.category_slug)
        tx = Transaction(
            household_id=user.household_id,
            account_id=payload.account_id,
            date=t.date,
            label=t.label,
            amount=t.amount,
            category_id=cat_id,
            is_manual_category=t.is_manual_category,
            is_recurring_override=t.is_recurring_override,
            notes=t.notes or "",
            dedup_hash=dedup,
        )
        db.add(tx)
        existing_hashes.add(dedup)  # avoid duplicates within the same batch
        inserted += 1

    db.commit()
    return TransactionImportResult(inserted=inserted, skipped_duplicates=skipped)


@router.put("/{tx_id}", response_model=TransactionOut)
def update_transaction(tx_id: str, payload: TransactionUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.household_id == user.household_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    data = payload.model_dump(exclude_unset=True)
    if "category_slug" in data:
        cat_slug = data.pop("category_slug")
        tx.category_id = _resolve_category_id(db, user.household_id, cat_slug)
    for k, v in data.items():
        setattr(tx, k, v)
    db.commit()
    db.refresh(tx)
    return _to_out(tx, db)


@router.delete("/{tx_id}", status_code=204)
def delete_transaction(tx_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    tx = db.query(Transaction).filter(Transaction.id == tx_id, Transaction.household_id == user.household_id).first()
    if not tx:
        raise HTTPException(status_code=404, detail="Transaction non trouvée")
    db.delete(tx)
    db.commit()
