"""
Authentication endpoints: register and login.

POST /auth/register: creates a household + first user (admin) + default categories
POST /auth/login: returns a JWT
GET /auth/me: returns the current user info
"""
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User, Household, Category
from app.schemas import UserCreate, UserLogin, Token, UserOut
from app.auth import hash_password, verify_password, create_access_token, get_current_user
from app.defaults import DEFAULT_CATEGORIES

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=Token, status_code=status.HTTP_201_CREATED)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    """Create a new household with its first admin user. Seeds default categories."""
    existing = db.query(User).filter(User.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Cet email est déjà utilisé")

    # Create household
    household = Household(name=payload.household_name or "Mon foyer")
    db.add(household)
    db.flush()  # generate household.id without committing

    # Create user (first user = admin)
    user = User(
        email=payload.email,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        is_admin=True,
        household_id=household.id,
    )
    db.add(user)

    # Seed default categories for the household
    for cat in DEFAULT_CATEGORIES:
        db.add(Category(household_id=household.id, **cat))

    db.commit()
    db.refresh(user)

    token = create_access_token(user.id, household.id)
    return Token(access_token=token)


@router.post("/login", response_model=Token)
def login(payload: UserLogin, db: Session = Depends(get_db)):
    """Authenticate and return a JWT."""
    user = db.query(User).filter(User.email == payload.email, User.is_active == True).first()
    if not user or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Email ou mot de passe incorrect")

    token = create_access_token(user.id, user.household_id)
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    """Return the current authenticated user."""
    return current_user
