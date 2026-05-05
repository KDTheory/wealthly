"""
Other endpoints: categories, budgets, goals, achievements, categorisation rules.
Plus a dedicated /migrate endpoint that ingests a Wealthly v2.0 JSON backup.
"""
from typing import List
from datetime import datetime
from fastapi import APIRouter, Depends, HTTPException, Body
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import (
    User, Category, Budget, Goal, Achievement,
    CategorisationRule, Member, Account, Transaction, Asset, Liability,
)
from app.schemas import (
    CategoryOut, CategoryUpdate, BudgetSet, BudgetOut,
    GoalCreate, GoalUpdate, GoalOut,
    AchievementOut, RuleCreate, RuleOut,
)
from app.auth import get_current_user

router = APIRouter(tags=["other"])


# ============================================================================
# CATEGORIES
# ============================================================================

@router.get("/categories", response_model=List[CategoryOut])
def list_categories(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Category).filter(Category.household_id == user.household_id).all()


@router.put("/categories/{slug}", response_model=CategoryOut)
def update_category(slug: str, payload: CategoryUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    cat = db.query(Category).filter(Category.slug == slug, Category.household_id == user.household_id).first()
    if not cat:
        raise HTTPException(status_code=404, detail="Catégorie non trouvée")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(cat, k, v)
    db.commit()
    db.refresh(cat)
    return cat


# ============================================================================
# BUDGETS
# ============================================================================

@router.get("/budgets", response_model=List[BudgetOut])
def list_budgets(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Budget).filter(Budget.household_id == user.household_id).all()


@router.post("/budgets", response_model=BudgetOut)
def set_budget(payload: BudgetSet, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Upsert: create budget for category if missing, otherwise update amount."""
    budget = db.query(Budget).filter(
        Budget.household_id == user.household_id,
        Budget.category_slug == payload.category_slug,
    ).first()
    if budget:
        budget.amount = payload.amount
    else:
        budget = Budget(
            household_id=user.household_id,
            category_slug=payload.category_slug,
            amount=payload.amount,
        )
        db.add(budget)
    db.commit()
    db.refresh(budget)
    return budget


@router.delete("/budgets/{slug}", status_code=204)
def delete_budget(slug: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    budget = db.query(Budget).filter(Budget.household_id == user.household_id, Budget.category_slug == slug).first()
    if budget:
        db.delete(budget)
        db.commit()


# ============================================================================
# GOALS
# ============================================================================

@router.get("/goals", response_model=List[GoalOut])
def list_goals(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Goal).filter(Goal.household_id == user.household_id).all()


@router.post("/goals", response_model=GoalOut, status_code=201)
def create_goal(payload: GoalCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = Goal(household_id=user.household_id, **payload.model_dump())
    db.add(goal)
    db.commit()
    db.refresh(goal)
    return goal


@router.put("/goals/{goal_id}", response_model=GoalOut)
def update_goal(goal_id: str, payload: GoalUpdate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.household_id == user.household_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objectif non trouvé")
    for k, v in payload.model_dump(exclude_unset=True).items():
        setattr(goal, k, v)
    db.commit()
    db.refresh(goal)
    return goal


@router.delete("/goals/{goal_id}", status_code=204)
def delete_goal(goal_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    goal = db.query(Goal).filter(Goal.id == goal_id, Goal.household_id == user.household_id).first()
    if not goal:
        raise HTTPException(status_code=404, detail="Objectif non trouvé")
    db.delete(goal)
    db.commit()


# ============================================================================
# ACHIEVEMENTS
# ============================================================================

@router.get("/achievements", response_model=List[AchievementOut])
def list_achievements(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(Achievement).filter(Achievement.household_id == user.household_id).all()


@router.post("/achievements/{slug}", response_model=AchievementOut, status_code=201)
def unlock_achievement(slug: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """Unlock an achievement (idempotent: returns existing if already unlocked)."""
    existing = db.query(Achievement).filter(
        Achievement.household_id == user.household_id,
        Achievement.achievement_slug == slug,
    ).first()
    if existing:
        return existing
    ach = Achievement(household_id=user.household_id, achievement_slug=slug)
    db.add(ach)
    db.commit()
    db.refresh(ach)
    return ach


# ============================================================================
# RULES (auto-categorisation)
# ============================================================================

@router.get("/rules", response_model=List[RuleOut])
def list_rules(db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    return db.query(CategorisationRule).filter(CategorisationRule.household_id == user.household_id).all()


@router.post("/rules", response_model=RuleOut, status_code=201)
def create_rule(payload: RuleCreate, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rule = CategorisationRule(household_id=user.household_id, **payload.model_dump())
    db.add(rule)
    db.commit()
    db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=204)
def delete_rule(rule_id: str, db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    rule = db.query(CategorisationRule).filter(CategorisationRule.id == rule_id, CategorisationRule.household_id == user.household_id).first()
    if rule:
        db.delete(rule)
        db.commit()


# ============================================================================
# MIGRATION FROM v2.0 JSON BACKUP
# ============================================================================

@router.post("/migrate/import-json", status_code=201)
def import_v2_backup(payload: dict = Body(...), db: Session = Depends(get_db), user: User = Depends(get_current_user)):
    """
    Import a Wealthly v2.0 JSON backup (the file you can export from the artifact app).
    This replaces nothing — it ADDS to the current household. Wipe via DELETE endpoints
    first if you want a clean re-import.

    Expected shape (from frontend exportData):
      { version: 2, members: [...], accounts: [...], transactions: [...],
        assets: [...], liabilities: [...], budgets: {...}, goals: [...],
        customRules: [...], achievements: [...] }
    """
    hh_id = user.household_id
    stats = {"members": 0, "accounts": 0, "transactions": 0, "assets": 0, "liabilities": 0,
             "budgets": 0, "goals": 0, "achievements": 0, "rules": 0}

    # ---- Members: build a map old_id -> new Member ----
    member_id_map = {}
    for m in payload.get("members", []):
        member = Member(
            household_id=hh_id,
            name=m.get("name", "Sans nom"),
            role=m.get("role", "adult"),
            color=m.get("color", "#3b82f6"),
        )
        db.add(member)
        db.flush()
        member_id_map[m["id"]] = member.id
        stats["members"] += 1

    # ---- Accounts ----
    account_id_map = {}
    for a in payload.get("accounts", []):
        account = Account(
            household_id=hh_id,
            name=a.get("name", "Compte"),
            bank=a.get("bank"),
            type=a.get("type", "checking"),
            initial_balance=float(a.get("initialBalance", 0) or 0),
        )
        # Map old member ids
        old_member_ids = a.get("memberIds", [])
        new_members = [member_id_map[mid] for mid in old_member_ids if mid in member_id_map]
        if new_members:
            account.members = db.query(Member).filter(Member.id.in_(new_members)).all()
        db.add(account)
        db.flush()
        account_id_map[a["id"]] = account.id
        stats["accounts"] += 1

    # ---- Transactions (with dedup) ----
    existing_hashes = set(h for (h,) in db.query(Transaction.dedup_hash).filter(Transaction.household_id == hh_id).all())
    cat_slug_to_id = {c.slug: c.id for c in db.query(Category).filter(Category.household_id == hh_id).all()}

    for t in payload.get("transactions", []):
        old_acc_id = t.get("accountId")
        if old_acc_id not in account_id_map:
            continue
        new_acc_id = account_id_map[old_acc_id]
        try:
            tx_date = datetime.strptime(t["date"], "%Y-%m-%d").date()
        except (ValueError, KeyError):
            continue
        amount = float(t.get("amount", 0))
        label = t.get("label", "")[:500]
        dedup = f"{new_acc_id}|{tx_date.isoformat()}|{amount:.2f}|{label[:50].lower().strip()}"
        if dedup in existing_hashes:
            continue
        cat_id = cat_slug_to_id.get(t.get("categoryId"))
        tx = Transaction(
            household_id=hh_id,
            account_id=new_acc_id,
            date=tx_date,
            label=label,
            amount=amount,
            category_id=cat_id,
            is_manual_category=bool(t.get("isManualCategory", False)),
            notes=t.get("notes", ""),
            dedup_hash=dedup,
        )
        db.add(tx)
        existing_hashes.add(dedup)
        stats["transactions"] += 1

    # ---- Assets ----
    for a in payload.get("assets", []):
        asset = Asset(
            household_id=hh_id,
            type=a.get("type", "other_asset"),
            name=a.get("name", "Actif"),
            current_value=float(a.get("currentValue", 0) or 0),
            notes=a.get("notes", ""),
        )
        old_member_ids = a.get("memberIds", [])
        new_members = [member_id_map[mid] for mid in old_member_ids if mid in member_id_map]
        if new_members:
            asset.members = db.query(Member).filter(Member.id.in_(new_members)).all()
        db.add(asset)
        stats["assets"] += 1

    # ---- Liabilities ----
    for l in payload.get("liabilities", []):
        end_date = None
        if l.get("endDate"):
            try:
                end_date = datetime.strptime(l["endDate"], "%Y-%m-%d").date()
            except ValueError:
                pass
        lia = Liability(
            household_id=hh_id,
            type=l.get("type", "other_loan"),
            name=l.get("name", "Prêt"),
            initial_capital=float(l.get("initialCapital", 0) or 0),
            remaining_capital=float(l.get("remainingCapital", 0) or 0),
            monthly_payment=float(l.get("monthlyPayment", 0) or 0),
            interest_rate=float(l.get("interestRate", 0) or 0),
            end_date=end_date,
            notes=l.get("notes", ""),
        )
        old_member_ids = l.get("memberIds", [])
        new_members = [member_id_map[mid] for mid in old_member_ids if mid in member_id_map]
        if new_members:
            lia.members = db.query(Member).filter(Member.id.in_(new_members)).all()
        db.add(lia)
        stats["liabilities"] += 1

    # ---- Budgets (dict slug -> amount) ----
    for slug, amount in (payload.get("budgets") or {}).items():
        if not amount:
            continue
        existing = db.query(Budget).filter(Budget.household_id == hh_id, Budget.category_slug == slug).first()
        if existing:
            existing.amount = float(amount)
        else:
            db.add(Budget(household_id=hh_id, category_slug=slug, amount=float(amount)))
        stats["budgets"] += 1

    # ---- Goals ----
    for g in payload.get("goals", []):
        deadline = None
        if g.get("deadline"):
            try:
                deadline = datetime.strptime(g["deadline"], "%Y-%m-%d").date()
            except ValueError:
                pass
        db.add(Goal(
            household_id=hh_id,
            name=g.get("name", "Objectif"),
            emoji=g.get("emoji", "🎯"),
            target_amount=float(g.get("target", 0) or 0),
            current_amount=float(g.get("current", 0) or 0),
            deadline=deadline,
        ))
        stats["goals"] += 1

    # ---- Achievements ----
    existing_slugs = set(s for (s,) in db.query(Achievement.achievement_slug).filter(Achievement.household_id == hh_id).all())
    for slug in payload.get("achievements", []):
        if slug in existing_slugs:
            continue
        db.add(Achievement(household_id=hh_id, achievement_slug=slug))
        existing_slugs.add(slug)
        stats["achievements"] += 1

    # ---- Custom rules ----
    for r in payload.get("customRules", []):
        db.add(CategorisationRule(
            household_id=hh_id,
            pattern=r.get("pattern", ""),
            category_slug=r.get("categoryId", "uncategorized"),
            source=r.get("source", "learned"),
        ))
        stats["rules"] += 1

    db.commit()
    return {"status": "ok", "imported": stats}
