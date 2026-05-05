"""
Accounts endpoints: bank accounts, with member assignment for joint accounts.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Account, Member, Transaction
from app.schemas import AccountCreate, AccountUpdate, AccountOut
from app.auth import get_current_user

router = APIRouter(prefix="/accounts", tags=["accounts"])


def _to_out(account: Account, db: Session) -> dict:
    """Serialize an Account, computing its current balance from transactions."""
    tx_sum = db.query(Transaction).filter(Transaction.account_id == account.id).all()
    current = (account.initial_balance or 0.0) + sum(t.amount for t in tx_sum)
    return {
        "id": account.id,
        "name": account.name,
        "bank": account.bank,
        "type": account.type,
        "initial_balance": account.initial_balance,
        "household_id": account.household_id,
        "member_ids": [m.id for m in account.members],
        "current_balance": current,
    }


@router.get("", response_model=List[AccountOut])
def list_accounts(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    accounts = db.query(Account).filter(Account.household_id == user.household_id).all()
    return [_to_out(a, db) for a in accounts]


@router.post("", response_model=AccountOut, status_code=201)
def create_account(payload: AccountCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude={"member_ids"})
    account = Account(household_id=user.household_id, **data)
    if payload.member_ids:
        members = db.query(Member).filter(
            Member.id.in_(payload.member_ids),
            Member.household_id == user.household_id,
        ).all()
        account.members = members
    db.add(account)
    db.commit()
    db.refresh(account)
    return _to_out(account, db)


@router.put("/{account_id}", response_model=AccountOut)
def update_account(account_id: str, payload: AccountUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.household_id == user.household_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    data = payload.model_dump(exclude_unset=True)
    member_ids = data.pop("member_ids", None)
    for k, v in data.items():
        setattr(account, k, v)
    if member_ids is not None:
        members = db.query(Member).filter(
            Member.id.in_(member_ids),
            Member.household_id == user.household_id,
        ).all()
        account.members = members
    db.commit()
    db.refresh(account)
    return _to_out(account, db)


@router.delete("/{account_id}", status_code=204)
def delete_account(account_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    account = db.query(Account).filter(Account.id == account_id, Account.household_id == user.household_id).first()
    if not account:
        raise HTTPException(status_code=404, detail="Compte non trouvé")
    db.delete(account)
    db.commit()
