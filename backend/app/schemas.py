"""
Pydantic schemas — define the JSON shapes accepted and returned by the API.
- *Create schemas: input for POST endpoints
- *Update schemas: input for PUT/PATCH endpoints (all fields optional)
- *Out schemas: output (what the client sees)
"""
from datetime import datetime, date
from typing import Optional, List
from pydantic import BaseModel, EmailStr, Field, ConfigDict


# ============================================================================
# AUTH
# ============================================================================

class UserCreate(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    full_name: str
    household_name: Optional[str] = "Mon foyer"


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserOut(BaseModel):
    id: str
    email: str
    full_name: str
    is_admin: bool
    household_id: str
    member_id: Optional[str] = None

    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# MEMBERS
# ============================================================================

class MemberBase(BaseModel):
    name: str
    role: str = "adult"  # adult | child
    color: str = "#3b82f6"


class MemberCreate(MemberBase):
    pass


class MemberUpdate(BaseModel):
    name: Optional[str] = None
    role: Optional[str] = None
    color: Optional[str] = None


class MemberOut(MemberBase):
    id: str
    household_id: str
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ACCOUNTS
# ============================================================================

class AccountBase(BaseModel):
    name: str
    bank: Optional[str] = None
    type: str = "checking"
    role: str = "principal"  # principal | depenses | epargne | investissement | professionnel
    initial_balance: float = 0.0


class AccountCreate(AccountBase):
    member_ids: List[str] = []


class AccountUpdate(BaseModel):
    name: Optional[str] = None
    bank: Optional[str] = None
    type: Optional[str] = None
    role: Optional[str] = None
    initial_balance: Optional[float] = None
    member_ids: Optional[List[str]] = None


class AccountOut(AccountBase):
    id: str
    household_id: str
    member_ids: List[str] = []
    current_balance: float = 0.0  # computed: initial + sum(transactions)
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# TRANSACTIONS
# ============================================================================

class TransactionBase(BaseModel):
    account_id: str
    date: date
    label: str = ""
    amount: float
    category_slug: Optional[str] = None
    is_manual_category: bool = False
    is_recurring_override: Optional[bool] = None
    is_transfer_override: Optional[bool] = None
    notes: Optional[str] = ""


class TransactionCreate(TransactionBase):
    pass


class TransactionUpdate(BaseModel):
    label: Optional[str] = None
    category_slug: Optional[str] = None
    is_manual_category: Optional[bool] = None
    is_recurring_override: Optional[bool] = None
    is_transfer_override: Optional[bool] = None
    notes: Optional[str] = None


class TransactionOut(TransactionBase):
    id: str
    household_id: str
    model_config = ConfigDict(from_attributes=True)


class TransactionImport(BaseModel):
    """Bulk import endpoint: list of transactions to insert (deduped server-side)."""
    account_id: str
    transactions: List[TransactionCreate]


class TransactionImportResult(BaseModel):
    inserted: int
    skipped_duplicates: int


# ============================================================================
# ASSETS
# ============================================================================

class AssetBase(BaseModel):
    type: str
    name: str
    current_value: float = 0.0
    notes: Optional[str] = ""
    # Real estate enrichment — all optional, used by the immo wizard
    subtype: Optional[str] = None
    purchase_price: Optional[float] = None
    surface_m2: Optional[float] = None
    notary_fees: Optional[float] = None
    agency_fees: Optional[float] = None
    works_fees: Optional[float] = None
    furniture_fees: Optional[float] = None
    purchase_date: Optional[date] = None
    construction_year: Optional[int] = None
    ownership_pct: Optional[float] = 100.0
    address: Optional[str] = None


class AssetCreate(AssetBase):
    member_ids: List[str] = []


class AssetUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    current_value: Optional[float] = None
    notes: Optional[str] = None
    member_ids: Optional[List[str]] = None
    subtype: Optional[str] = None
    purchase_price: Optional[float] = None
    surface_m2: Optional[float] = None
    notary_fees: Optional[float] = None
    agency_fees: Optional[float] = None
    works_fees: Optional[float] = None
    furniture_fees: Optional[float] = None
    purchase_date: Optional[date] = None
    construction_year: Optional[int] = None
    ownership_pct: Optional[float] = None
    address: Optional[str] = None


class AssetOut(AssetBase):
    id: str
    household_id: str
    member_ids: List[str] = []
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# LIABILITIES
# ============================================================================

class LiabilityBase(BaseModel):
    type: str
    name: str
    initial_capital: float = 0.0
    remaining_capital: float = 0.0
    monthly_payment: float = 0.0
    interest_rate: float = 0.0
    end_date: Optional[date] = None
    notes: Optional[str] = ""
    # Enriched fields — all optional, legacy loans still load fine
    down_payment: Optional[float] = None
    insurance_rate: Optional[float] = None
    application_fees: Optional[float] = None
    ownership_pct: Optional[float] = 100.0
    duration_months: Optional[int] = None
    start_date: Optional[date] = None
    linked_asset_id: Optional[str] = None


class LiabilityCreate(LiabilityBase):
    member_ids: List[str] = []


class LiabilityUpdate(BaseModel):
    type: Optional[str] = None
    name: Optional[str] = None
    initial_capital: Optional[float] = None
    remaining_capital: Optional[float] = None
    monthly_payment: Optional[float] = None
    interest_rate: Optional[float] = None
    end_date: Optional[date] = None
    notes: Optional[str] = None
    member_ids: Optional[List[str]] = None
    down_payment: Optional[float] = None
    insurance_rate: Optional[float] = None
    application_fees: Optional[float] = None
    ownership_pct: Optional[float] = None
    duration_months: Optional[int] = None
    start_date: Optional[date] = None
    linked_asset_id: Optional[str] = None


class LiabilityOut(LiabilityBase):
    id: str
    household_id: str
    member_ids: List[str] = []
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# CATEGORIES
# ============================================================================

class CategoryOut(BaseModel):
    id: str
    slug: str
    name: str
    color: str
    icon: str
    type: str
    kind: str
    model_config = ConfigDict(from_attributes=True)


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    color: Optional[str] = None
    icon: Optional[str] = None
    kind: Optional[str] = None


# ============================================================================
# BUDGETS
# ============================================================================

class BudgetSet(BaseModel):
    category_slug: str
    amount: float


class BudgetOut(BaseModel):
    category_slug: str
    amount: float
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# GOALS
# ============================================================================

class GoalBase(BaseModel):
    name: str
    emoji: str = "🎯"
    target_amount: float = 0.0
    current_amount: float = 0.0
    deadline: Optional[date] = None


class GoalCreate(GoalBase):
    pass


class GoalUpdate(BaseModel):
    name: Optional[str] = None
    emoji: Optional[str] = None
    target_amount: Optional[float] = None
    current_amount: Optional[float] = None
    deadline: Optional[date] = None


class GoalOut(GoalBase):
    id: str
    household_id: str
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ACHIEVEMENTS
# ============================================================================

class AchievementOut(BaseModel):
    achievement_slug: str
    unlocked_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# RULES (auto-categorisation)
# ============================================================================

class RuleCreate(BaseModel):
    pattern: str
    category_slug: str
    source: str = "manual"


class RuleOut(RuleCreate):
    id: str
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# WEALTH SNAPSHOTS
# ============================================================================

class WealthSnapshotCreate(BaseModel):
    month: str  # 'YYYY-MM'
    net_worth: float
    liquid_wealth: float
    assets_value: float
    liabilities_value: float
    real_estate_value: Optional[float] = None
    financial_assets_value: Optional[float] = None
    mortgage_debt: Optional[float] = None
    other_debt: Optional[float] = None


class WealthSnapshotOut(WealthSnapshotCreate):
    id: str
    captured_at: datetime
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# PASSWORD RESET
# ============================================================================

class ForgotPasswordRequest(BaseModel):
    email: EmailStr


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


class MessageOut(BaseModel):
    message: str
