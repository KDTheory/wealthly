"""
Admin endpoints — protected by `require_admin`.
Powers the full /admin SaaS management panel.

Sections:
  GET  /admin/metrics                  → product KPIs (users, households, transactions, assets)
  GET  /admin/growth                   → signups per day for the last 30 days
  GET  /admin/stats                    → security KPIs (auth events)
  GET  /admin/auth-events              → recent auth events (filterable)
  GET  /admin/users                    → users list with rich stats
  GET  /admin/households               → households list with stats
  PUT  /admin/users/{id}/toggle        → suspend / reactivate user
  DELETE /admin/users/{id}             → hard-delete user
  PUT  /admin/households/{id}/plan     → change subscription plan
  POST /admin/users/{id}/reset-password → trigger password reset email
"""
from datetime import datetime, timedelta, date
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func, and_
from sqlalchemy.orm import Session

from app.auth import require_admin
from app.database import get_db
from app.models import (
    AuthEvent, User, Household, Member, Account,
    Transaction, Asset, Liability,
)
from app.security import LOCKOUT_DURATION, LOCKOUT_THRESHOLD, LOCKOUT_WINDOW, record_auth_event
from app.email_service import send_password_reset_email
from app.config import settings
import hashlib, secrets
from app.models import PasswordResetToken

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])

PLAN_LABELS = {
    "solo": "Solo",
    "pro": "Pro",
    "family": "Famille",
    "admin": "Admin (gratuit)",
}


# ── Security KPIs ─────────────────────────────────────────────────────────────

@router.get("/stats")
def stats(db: Session = Depends(get_db)):
    now = datetime.utcnow()
    cutoff_24h = now - timedelta(hours=24)
    cutoff_7d = now - timedelta(days=7)
    cutoff_lockout = now - LOCKOUT_DURATION

    total_users = db.query(func.count(User.id)).scalar() or 0
    active_7d = (
        db.query(func.count(func.distinct(AuthEvent.user_id)))
        .filter(AuthEvent.kind == "login_success")
        .filter(AuthEvent.created_at >= cutoff_7d)
        .scalar() or 0
    )
    failures_24h = (
        db.query(func.count(AuthEvent.id))
        .filter(AuthEvent.kind == "login_failure")
        .filter(AuthEvent.created_at >= cutoff_24h)
        .scalar() or 0
    )

    lockouts = []
    candidates = (
        db.query(AuthEvent.email, func.count(AuthEvent.id).label("n"))
        .filter(AuthEvent.kind == "login_failure")
        .filter(AuthEvent.created_at >= cutoff_lockout)
        .group_by(AuthEvent.email)
        .having(func.count(AuthEvent.id) >= LOCKOUT_THRESHOLD)
        .all()
    )
    for email, n in candidates:
        if not email:
            continue
        success_after = (
            db.query(AuthEvent)
            .filter(AuthEvent.email == email)
            .filter(AuthEvent.kind == "login_success")
            .filter(AuthEvent.created_at >= cutoff_lockout)
            .first()
        )
        if not success_after:
            lockouts.append({"email": email, "failures": int(n)})

    return {
        "total_users": int(total_users),
        "active_7d": int(active_7d),
        "failures_24h": int(failures_24h),
        "lockouts": lockouts,
        "lockout_threshold": LOCKOUT_THRESHOLD,
        "lockout_window_minutes": int(LOCKOUT_WINDOW.total_seconds() // 60),
        "lockout_duration_minutes": int(LOCKOUT_DURATION.total_seconds() // 60),
    }


# ── Product metrics ────────────────────────────────────────────────────────────

@router.get("/metrics")
def metrics(db: Session = Depends(get_db)):
    """Global product KPIs for the overview dashboard."""
    total_users = db.query(func.count(User.id)).scalar() or 0
    active_users = db.query(func.count(User.id)).filter(User.is_active == True).scalar() or 0
    total_households = db.query(func.count(Household.id)).scalar() or 0

    total_transactions = db.query(func.count(Transaction.id)).scalar() or 0
    total_assets_value = db.query(func.sum(Asset.current_value)).scalar() or 0
    total_liabilities_value = db.query(func.sum(Liability.remaining_capital)).scalar() or 0
    total_accounts = db.query(func.count(Account.id)).scalar() or 0

    # Plans breakdown
    plans = (
        db.query(Household.plan, func.count(Household.id).label("n"))
        .group_by(Household.plan)
        .all()
    )
    plans_breakdown = {p: int(n) for p, n in plans}

    # New users this week / this month
    now = datetime.utcnow()
    week_ago = now - timedelta(days=7)
    month_ago = now - timedelta(days=30)
    new_this_week = db.query(func.count(User.id)).filter(User.created_at >= week_ago).scalar() or 0
    new_this_month = db.query(func.count(User.id)).filter(User.created_at >= month_ago).scalar() or 0

    return {
        "total_users": int(total_users),
        "active_users": int(active_users),
        "total_households": int(total_households),
        "total_transactions": int(total_transactions),
        "total_assets_value": float(total_assets_value),
        "total_liabilities_value": float(total_liabilities_value),
        "net_assets_value": float(total_assets_value - total_liabilities_value),
        "total_accounts": int(total_accounts),
        "plans_breakdown": plans_breakdown,
        "new_users_this_week": int(new_this_week),
        "new_users_this_month": int(new_this_month),
    }


@router.get("/growth")
def growth(db: Session = Depends(get_db)):
    """Daily signups for the last 30 days."""
    now = datetime.utcnow()
    since = now - timedelta(days=30)

    rows = (
        db.query(
            func.date(User.created_at).label("day"),
            func.count(User.id).label("signups"),
        )
        .filter(User.created_at >= since)
        .group_by(func.date(User.created_at))
        .order_by(func.date(User.created_at))
        .all()
    )

    # Fill in zeros for days with no signups
    result_map = {str(r.day): int(r.signups) for r in rows}
    data = []
    for i in range(30):
        d = (now - timedelta(days=29 - i)).date()
        data.append({"date": str(d), "signups": result_map.get(str(d), 0)})

    return data


# ── Auth events ───────────────────────────────────────────────────────────────

@router.get("/auth-events")
def auth_events(
    limit: int = Query(100, ge=1, le=500),
    kind: Optional[str] = Query(None),
    db: Session = Depends(get_db),
):
    q = db.query(AuthEvent).order_by(desc(AuthEvent.created_at))
    if kind:
        q = q.filter(AuthEvent.kind == kind)
    events = q.limit(limit).all()
    return [
        {
            "id": e.id,
            "user_id": e.user_id,
            "email": e.email,
            "kind": e.kind,
            "success": bool(e.success),
            "ip": e.ip,
            "user_agent": e.user_agent,
            "detail": e.detail,
            "created_at": e.created_at.isoformat() if e.created_at else None,
        }
        for e in events
    ]


# ── Users ─────────────────────────────────────────────────────────────────────

@router.get("/users")
def users(db: Session = Depends(get_db)):
    """Users with rich stats: last login, login count, transaction count, household plan."""
    rows = db.query(User).order_by(desc(User.created_at)).all()
    out = []
    for u in rows:
        last_login = (
            db.query(AuthEvent)
            .filter(AuthEvent.user_id == u.id, AuthEvent.kind == "login_success")
            .order_by(desc(AuthEvent.created_at))
            .first()
        )
        login_count = (
            db.query(func.count(AuthEvent.id))
            .filter(AuthEvent.user_id == u.id, AuthEvent.kind == "login_success")
            .scalar() or 0
        )
        tx_count = (
            db.query(func.count(Transaction.id))
            .filter(Transaction.household_id == u.household_id)
            .scalar() or 0
        )
        last_tx = (
            db.query(Transaction.date)
            .filter(Transaction.household_id == u.household_id)
            .order_by(desc(Transaction.date))
            .first()
        )
        household = db.query(Household).filter(Household.id == u.household_id).first()

        out.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_admin": bool(u.is_admin),
            "is_active": bool(u.is_active),
            "household_id": u.household_id,
            "household_name": household.name if household else None,
            "plan": household.plan if household else "solo",
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": last_login.created_at.isoformat() if last_login else None,
            "last_login_ip": last_login.ip if last_login else None,
            "login_count": int(login_count),
            "transaction_count": int(tx_count),
            "last_activity": last_tx[0] if last_tx else None,
        })
    return out


# ── Households ────────────────────────────────────────────────────────────────

@router.get("/households")
def households(db: Session = Depends(get_db)):
    """All households with member/account/transaction stats."""
    rows = db.query(Household).order_by(desc(Household.created_at)).all()
    out = []
    for h in rows:
        member_count = db.query(func.count(Member.id)).filter(Member.household_id == h.id).scalar() or 0
        account_count = db.query(func.count(Account.id)).filter(Account.household_id == h.id).scalar() or 0
        tx_count = db.query(func.count(Transaction.id)).filter(Transaction.household_id == h.id).scalar() or 0
        assets_val = db.query(func.sum(Asset.current_value)).filter(Asset.household_id == h.id).scalar() or 0
        liabilities_val = db.query(func.sum(Liability.remaining_capital)).filter(Liability.household_id == h.id).scalar() or 0

        owner = (
            db.query(User)
            .filter(User.household_id == h.id, User.is_active == True)
            .order_by(User.created_at)
            .first()
        )

        out.append({
            "id": h.id,
            "name": h.name,
            "plan": h.plan,
            "plan_label": PLAN_LABELS.get(h.plan, h.plan),
            "created_at": h.created_at.isoformat() if h.created_at else None,
            "owner_email": owner.email if owner else None,
            "member_count": int(member_count),
            "account_count": int(account_count),
            "transaction_count": int(tx_count),
            "assets_value": float(assets_val),
            "liabilities_value": float(liabilities_val),
            "net_worth": float(assets_val - liabilities_val),
        })
    return out


# ── Actions ───────────────────────────────────────────────────────────────────

@router.put("/users/{user_id}/toggle")
def toggle_user_active(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Suspend or reactivate a user."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de modifier son propre compte.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Impossible de suspendre un administrateur.")

    user.is_active = not user.is_active
    db.commit()

    action = "user_suspended" if not user.is_active else "user_reactivated"
    record_auth_event(db, kind=action, success=True, user_id=admin.id, email=user.email,
                      detail=f"by_admin:{admin.email}")
    return {"id": user.id, "email": user.email, "is_active": bool(user.is_active)}


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Hard-delete a user. Irreversible."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer son propre compte.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Impossible de supprimer un administrateur.")

    record_auth_event(db, kind="user_deleted", success=True, user_id=admin.id, email=user.email,
                      detail=f"by_admin:{admin.email}")
    db.delete(user)
    db.commit()


@router.put("/households/{household_id}/plan")
def update_plan(
    household_id: str,
    body: dict,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Change the subscription plan of a household."""
    plan = body.get("plan", "")
    if plan not in PLAN_LABELS:
        raise HTTPException(status_code=400, detail=f"Plan invalide. Valeurs acceptées : {list(PLAN_LABELS.keys())}")

    household = db.query(Household).filter(Household.id == household_id).first()
    if not household:
        raise HTTPException(status_code=404, detail="Foyer introuvable.")

    old_plan = household.plan
    household.plan = plan
    db.commit()

    record_auth_event(db, kind="plan_changed", success=True, user_id=admin.id,
                      email=household.name, detail=f"{old_plan}->{plan} by {admin.email}")
    return {"id": household.id, "plan": household.plan, "plan_label": PLAN_LABELS[plan]}


@router.post("/users/{user_id}/reset-password")
def admin_reset_password(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Send a password reset email to a user (admin-initiated)."""
    user = db.query(User).filter(User.id == user_id, User.is_active == True).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable ou inactif.")

    # Invalidate old tokens
    db.query(PasswordResetToken).filter(
        PasswordResetToken.user_id == user.id,
        PasswordResetToken.used_at.is_(None),
    ).update({"used_at": datetime.utcnow()})

    raw_token = secrets.token_urlsafe(32)
    token_hash = hashlib.sha256(raw_token.encode()).hexdigest()
    record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=datetime.utcnow() + timedelta(minutes=60),
    )
    db.add(record)
    db.commit()

    link = f"{settings.FRONTEND_URL.rstrip('/')}/?reset_token={raw_token}"
    send_password_reset_email(user.email, user.full_name, link)

    record_auth_event(db, kind="admin_password_reset", success=True, user_id=admin.id,
                      email=user.email, detail=f"by_admin:{admin.email}")
    return {"message": f"Email de réinitialisation envoyé à {user.email}."}
