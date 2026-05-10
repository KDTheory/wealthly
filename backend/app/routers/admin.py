"""
Admin endpoints — protected by `require_admin`.
Powers the /admin frontend page.

  GET  /admin/stats                    → KPIs (users total, active 7d, failures 24h, lockouts)
  GET  /admin/auth-events              → recent auth events (default 100)
  GET  /admin/users                    → list users w/ last_login + auth_events count
  PUT  /admin/users/{user_id}/toggle   → suspend / reactivate a user (toggle is_active)
  DELETE /admin/users/{user_id}        → hard-delete a user (irreversible)
"""
from datetime import datetime, timedelta
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import desc, func
from sqlalchemy.orm import Session

from app.auth import require_admin, get_current_user
from app.database import get_db
from app.models import AuthEvent, User
from app.security import LOCKOUT_DURATION, LOCKOUT_THRESHOLD, LOCKOUT_WINDOW, record_auth_event

router = APIRouter(prefix="/admin", tags=["admin"], dependencies=[Depends(require_admin)])


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
        .scalar()
        or 0
    )
    failures_24h = (
        db.query(func.count(AuthEvent.id))
        .filter(AuthEvent.kind == "login_failure")
        .filter(AuthEvent.created_at >= cutoff_24h)
        .scalar()
        or 0
    )

    # Currently-locked emails: any email with ≥THRESHOLD failures in the
    # last (LOCKOUT_DURATION + LOCKOUT_WINDOW) and no success since.
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


@router.get("/auth-events")
def auth_events(
    limit: int = Query(100, ge=1, le=500),
    kind: Optional[str] = Query(None, description="Filter by kind"),
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


@router.get("/users")
def users(db: Session = Depends(get_db)):
    """List users with last login + total successful logins."""
    now = datetime.utcnow()
    rows = db.query(User).order_by(desc(User.created_at)).all()
    out: List[dict] = []
    for u in rows:
        last_login = (
            db.query(AuthEvent)
            .filter(AuthEvent.user_id == u.id)
            .filter(AuthEvent.kind == "login_success")
            .order_by(desc(AuthEvent.created_at))
            .first()
        )
        login_count = (
            db.query(func.count(AuthEvent.id))
            .filter(AuthEvent.user_id == u.id)
            .filter(AuthEvent.kind == "login_success")
            .scalar()
            or 0
        )
        out.append({
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "is_admin": bool(u.is_admin),
            "is_active": bool(u.is_active),
            "household_id": u.household_id,
            "created_at": u.created_at.isoformat() if u.created_at else None,
            "last_login_at": last_login.created_at.isoformat() if last_login else None,
            "last_login_ip": last_login.ip if last_login else None,
            "login_count": int(login_count),
        })
    return out


@router.put("/users/{user_id}/toggle")
def toggle_user_active(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Suspend or reactivate a user (toggle is_active). Cannot act on self or other admins."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de modifier son propre compte.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Impossible de suspendre un autre administrateur.")

    user.is_active = not user.is_active
    db.commit()

    action = "user_suspended" if not user.is_active else "user_reactivated"
    record_auth_event(db, kind=action, success=True, user_id=admin.id, email=user.email,
                      detail=f"by_admin:{admin.email}")

    return {
        "id": user.id,
        "email": user.email,
        "is_active": bool(user.is_active),
        "message": f"Utilisateur {'suspendu' if not user.is_active else 'réactivé'}.",
    }


@router.delete("/users/{user_id}", status_code=204)
def delete_user(
    user_id: str,
    admin: User = Depends(require_admin),
    db: Session = Depends(get_db),
):
    """Hard-delete a user. Irreversible. Cannot delete self or other admins."""
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Utilisateur introuvable.")
    if user.id == admin.id:
        raise HTTPException(status_code=400, detail="Impossible de supprimer son propre compte.")
    if user.is_admin:
        raise HTTPException(status_code=403, detail="Impossible de supprimer un autre administrateur.")

    record_auth_event(db, kind="user_deleted", success=True, user_id=admin.id, email=user.email,
                      detail=f"by_admin:{admin.email}")
    db.delete(user)
    db.commit()
