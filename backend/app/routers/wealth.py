"""
Wealth endpoints: assets and liabilities.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Asset, Liability, Member
from app.schemas import (
    AssetCreate, AssetUpdate, AssetOut,
    LiabilityCreate, LiabilityUpdate, LiabilityOut,
)
from app.auth import get_current_user

router = APIRouter(tags=["wealth"])


# ============================================================================
# ASSETS
# ============================================================================

def _asset_to_out(a: Asset) -> dict:
    return {
        "id": a.id,
        "type": a.type,
        "name": a.name,
        "current_value": a.current_value,
        "notes": a.notes or "",
        "household_id": a.household_id,
        "member_ids": [m.id for m in a.members],
        "updated_at": a.updated_at,
    }


@router.get("/assets", response_model=List[AssetOut])
def list_assets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [_asset_to_out(a) for a in db.query(Asset).filter(Asset.household_id == user.household_id).all()]


@router.post("/assets", response_model=AssetOut, status_code=201)
def create_asset(payload: AssetCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude={"member_ids"})
    asset = Asset(household_id=user.household_id, **data)
    if payload.member_ids:
        asset.members = db.query(Member).filter(
            Member.id.in_(payload.member_ids),
            Member.household_id == user.household_id,
        ).all()
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return _asset_to_out(asset)


@router.put("/assets/{asset_id}", response_model=AssetOut)
def update_asset(asset_id: str, payload: AssetUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.household_id == user.household_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Actif non trouvé")
    data = payload.model_dump(exclude_unset=True)
    member_ids = data.pop("member_ids", None)
    for k, v in data.items():
        setattr(asset, k, v)
    if member_ids is not None:
        asset.members = db.query(Member).filter(
            Member.id.in_(member_ids),
            Member.household_id == user.household_id,
        ).all()
    db.commit()
    db.refresh(asset)
    return _asset_to_out(asset)


@router.delete("/assets/{asset_id}", status_code=204)
def delete_asset(asset_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    asset = db.query(Asset).filter(Asset.id == asset_id, Asset.household_id == user.household_id).first()
    if not asset:
        raise HTTPException(status_code=404, detail="Actif non trouvé")
    db.delete(asset)
    db.commit()


# ============================================================================
# LIABILITIES
# ============================================================================

def _liability_to_out(l: Liability) -> dict:
    return {
        "id": l.id,
        "type": l.type,
        "name": l.name,
        "initial_capital": l.initial_capital,
        "remaining_capital": l.remaining_capital,
        "monthly_payment": l.monthly_payment,
        "interest_rate": l.interest_rate,
        "end_date": l.end_date,
        "notes": l.notes or "",
        "household_id": l.household_id,
        "member_ids": [m.id for m in l.members],
    }


@router.get("/liabilities", response_model=List[LiabilityOut])
def list_liabilities(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return [_liability_to_out(l) for l in db.query(Liability).filter(Liability.household_id == user.household_id).all()]


@router.post("/liabilities", response_model=LiabilityOut, status_code=201)
def create_liability(payload: LiabilityCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    data = payload.model_dump(exclude={"member_ids"})
    lia = Liability(household_id=user.household_id, **data)
    if payload.member_ids:
        lia.members = db.query(Member).filter(
            Member.id.in_(payload.member_ids),
            Member.household_id == user.household_id,
        ).all()
    db.add(lia)
    db.commit()
    db.refresh(lia)
    return _liability_to_out(lia)


@router.put("/liabilities/{lia_id}", response_model=LiabilityOut)
def update_liability(lia_id: str, payload: LiabilityUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lia = db.query(Liability).filter(Liability.id == lia_id, Liability.household_id == user.household_id).first()
    if not lia:
        raise HTTPException(status_code=404, detail="Prêt non trouvé")
    data = payload.model_dump(exclude_unset=True)
    member_ids = data.pop("member_ids", None)
    for k, v in data.items():
        setattr(lia, k, v)
    if member_ids is not None:
        lia.members = db.query(Member).filter(
            Member.id.in_(member_ids),
            Member.household_id == user.household_id,
        ).all()
    db.commit()
    db.refresh(lia)
    return _liability_to_out(lia)


@router.delete("/liabilities/{lia_id}", status_code=204)
def delete_liability(lia_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    lia = db.query(Liability).filter(Liability.id == lia_id, Liability.household_id == user.household_id).first()
    if not lia:
        raise HTTPException(status_code=404, detail="Prêt non trouvé")
    db.delete(lia)
    db.commit()
