"""
Members endpoints: CRUD on household members (adults and children).
All routes are scoped to the current user's household.
"""
from typing import List
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Member
from app.schemas import MemberCreate, MemberUpdate, MemberOut
from app.auth import get_current_user

router = APIRouter(prefix="/members", tags=["members"])


@router.get("", response_model=List[MemberOut])
def list_members(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Member).filter(Member.household_id == user.household_id).all()


@router.post("", response_model=MemberOut, status_code=201)
def create_member(payload: MemberCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = Member(household_id=user.household_id, **payload.model_dump())
    db.add(member)
    db.commit()
    db.refresh(member)
    return member


@router.put("/{member_id}", response_model=MemberOut)
def update_member(member_id: str, payload: MemberUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(Member).filter(Member.id == member_id, Member.household_id == user.household_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(member, k, v)
    db.commit()
    db.refresh(member)
    return member


@router.delete("/{member_id}", status_code=204)
def delete_member(member_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    member = db.query(Member).filter(Member.id == member_id, Member.household_id == user.household_id).first()
    if not member:
        raise HTTPException(status_code=404, detail="Membre non trouvé")
    db.delete(member)
    db.commit()
