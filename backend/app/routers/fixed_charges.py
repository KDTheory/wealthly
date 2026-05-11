"""
Fixed charges endpoints — stable monthly expenses defined by the user
(loyer, EDF, abonnements…). Used by the Suivi mensuel "Reste à vivre"
calculation: revenus - sum(active fixed charges).

Activity is bounded by start_month / end_month (YYYY-MM strings) so a
charge added today only counts from the current month onwards, and a
cancelled subscription stops being subtracted after its end month.
"""
from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import FixedCharge, Member, User

router = APIRouter(prefix="/fixed-charges", tags=["fixed-charges"])


class FixedChargeIn(BaseModel):
    name: str = Field(min_length=1, max_length=120)
    amount: float
    day_of_month: Optional[int] = Field(default=None, ge=1, le=31)
    category_slug: Optional[str] = None
    start_month: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    end_month: Optional[str] = Field(default=None, pattern=r"^\d{4}-\d{2}$")
    notes: Optional[str] = ""
    member_ids: Optional[list[str]] = None


class FixedChargeOut(BaseModel):
    id: str
    name: str
    amount: float
    day_of_month: Optional[int] = None
    category_slug: Optional[str] = None
    start_month: str
    end_month: Optional[str] = None
    notes: str = ""
    member_ids: list[str] = []


def _to_out(fc: FixedCharge) -> FixedChargeOut:
    return FixedChargeOut(
        id=fc.id,
        name=fc.name,
        amount=fc.amount,
        day_of_month=fc.day_of_month,
        category_slug=fc.category_slug,
        start_month=fc.start_month,
        end_month=fc.end_month,
        notes=fc.notes or "",
        member_ids=[m.id for m in fc.members],
    )


def _resolve_members(db: Session, household_id: str, ids: Optional[list[str]]) -> list[Member]:
    if not ids:
        return []
    return db.query(Member).filter(
        Member.id.in_(ids),
        Member.household_id == household_id,
    ).all()


@router.get("", response_model=list[FixedChargeOut])
def list_fixed_charges(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    items = db.query(FixedCharge).filter(
        FixedCharge.household_id == user.household_id,
    ).order_by(FixedCharge.amount.desc()).all()
    return [_to_out(it) for it in items]


@router.post("", response_model=FixedChargeOut, status_code=201)
def create_fixed_charge(payload: FixedChargeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    start = payload.start_month or datetime.utcnow().strftime("%Y-%m")
    fc = FixedCharge(
        household_id=user.household_id,
        name=payload.name.strip(),
        amount=float(payload.amount),
        day_of_month=payload.day_of_month,
        category_slug=payload.category_slug,
        start_month=start,
        end_month=payload.end_month,
        notes=(payload.notes or "")[:1000],
    )
    fc.members = _resolve_members(db, user.household_id, payload.member_ids)
    db.add(fc)
    db.commit()
    db.refresh(fc)
    return _to_out(fc)


@router.put("/{fc_id}", response_model=FixedChargeOut)
def update_fixed_charge(fc_id: str, payload: FixedChargeIn, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    fc = db.query(FixedCharge).filter(
        FixedCharge.id == fc_id,
        FixedCharge.household_id == user.household_id,
    ).first()
    if not fc:
        raise HTTPException(status_code=404, detail="Charge fixe introuvable")
    fc.name = payload.name.strip()
    fc.amount = float(payload.amount)
    fc.day_of_month = payload.day_of_month
    fc.category_slug = payload.category_slug
    if payload.start_month:
        fc.start_month = payload.start_month
    fc.end_month = payload.end_month
    fc.notes = (payload.notes or "")[:1000]
    fc.members = _resolve_members(db, user.household_id, payload.member_ids)
    db.commit()
    db.refresh(fc)
    return _to_out(fc)


@router.delete("/{fc_id}", status_code=204)
def delete_fixed_charge(fc_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    fc = db.query(FixedCharge).filter(
        FixedCharge.id == fc_id,
        FixedCharge.household_id == user.household_id,
    ).first()
    if not fc:
        raise HTTPException(status_code=404, detail="Charge fixe introuvable")
    db.delete(fc)
    db.commit()
