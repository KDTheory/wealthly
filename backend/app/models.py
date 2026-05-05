"""
Database models — these define the Postgres schema.

Hierarchy:
- Household: top-level container (one family = one household)
- User: a login (only adults have logins)
- Member: a person tracked (adults + children)
- Account: bank account, can belong to multiple members (joint accounts)
- Transaction: a single bank line item
- Asset, Liability: non-bank wealth items
- Category, Budget, Goal, Achievement: budgeting & gamification
"""
from datetime import datetime, date
from sqlalchemy import (
    Column, String, Integer, Float, Boolean, DateTime, Date,
    ForeignKey, Table, JSON, Text, UniqueConstraint, Index
)
from sqlalchemy.orm import relationship
import uuid

from app.database import Base


def _uuid():
    return str(uuid.uuid4())


# ============================================================================
# ASSOCIATION TABLES (many-to-many)
# ============================================================================

# Account <-> Member (a joint account belongs to multiple members)
account_members = Table(
    "account_members",
    Base.metadata,
    Column("account_id", String, ForeignKey("accounts.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", String, ForeignKey("members.id", ondelete="CASCADE"), primary_key=True),
)

# Asset <-> Member
asset_members = Table(
    "asset_members",
    Base.metadata,
    Column("asset_id", String, ForeignKey("assets.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", String, ForeignKey("members.id", ondelete="CASCADE"), primary_key=True),
)

# Liability <-> Member
liability_members = Table(
    "liability_members",
    Base.metadata,
    Column("liability_id", String, ForeignKey("liabilities.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", String, ForeignKey("members.id", ondelete="CASCADE"), primary_key=True),
)


# ============================================================================
# CORE TABLES
# ============================================================================

class Household(Base):
    """A family unit. Everything is scoped to a household."""
    __tablename__ = "households"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False, default="Mon foyer")
    created_at = Column(DateTime, default=datetime.utcnow)

    users = relationship("User", back_populates="household", cascade="all, delete-orphan")
    members = relationship("Member", back_populates="household", cascade="all, delete-orphan")
    accounts = relationship("Account", back_populates="household", cascade="all, delete-orphan")
    transactions = relationship("Transaction", back_populates="household", cascade="all, delete-orphan")
    assets = relationship("Asset", back_populates="household", cascade="all, delete-orphan")
    liabilities = relationship("Liability", back_populates="household", cascade="all, delete-orphan")
    categories = relationship("Category", back_populates="household", cascade="all, delete-orphan")
    budgets = relationship("Budget", back_populates="household", cascade="all, delete-orphan")
    goals = relationship("Goal", back_populates="household", cascade="all, delete-orphan")
    achievements = relationship("Achievement", back_populates="household", cascade="all, delete-orphan")
    rules = relationship("CategorisationRule", back_populates="household", cascade="all, delete-orphan")
    bank_connections = relationship("BankConnection", back_populates="household", cascade="all, delete-orphan")
    fixed_charges = relationship("FixedCharge", back_populates="household", cascade="all, delete-orphan")


class User(Base):
    """Login credentials for an adult member of the household."""
    __tablename__ = "users"

    id = Column(String, primary_key=True, default=_uuid)
    email = Column(String, unique=True, nullable=False, index=True)
    hashed_password = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)
    is_admin = Column(Boolean, default=False)  # admin can manage household settings
    created_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="users")

    # Optional link to a Member entry (adult users usually have a Member counterpart)
    member_id = Column(String, ForeignKey("members.id", ondelete="SET NULL"), nullable=True)


class Member(Base):
    """A person tracked in the household. Adults usually have a User login,
    children do not."""
    __tablename__ = "members"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    role = Column(String, nullable=False, default="adult")  # adult | child
    color = Column(String, nullable=False, default="#3b82f6")
    created_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="members")

    accounts = relationship("Account", secondary=account_members, back_populates="members")
    assets = relationship("Asset", secondary=asset_members, back_populates="members")
    liabilities = relationship("Liability", secondary=liability_members, back_populates="members")


class Account(Base):
    """A bank account. Can be owned by 1+ members (joint accounts)."""
    __tablename__ = "accounts"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    bank = Column(String, nullable=True)
    type = Column(String, nullable=False, default="checking")  # checking|savings|pea|credit
    initial_balance = Column(Float, nullable=False, default=0.0)
    created_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="accounts")

    members = relationship("Member", secondary=account_members, back_populates="accounts")
    transactions = relationship("Transaction", back_populates="account", cascade="all, delete-orphan")


class Transaction(Base):
    """A single transaction line from a bank statement."""
    __tablename__ = "transactions"

    id = Column(String, primary_key=True, default=_uuid)
    account_id = Column(String, ForeignKey("accounts.id", ondelete="CASCADE"), nullable=False, index=True)
    date = Column(Date, nullable=False, index=True)
    label = Column(String, nullable=False, default="")
    amount = Column(Float, nullable=False)
    category_id = Column(String, ForeignKey("categories.id", ondelete="SET NULL"), nullable=True)
    is_manual_category = Column(Boolean, default=False)
    is_recurring_override = Column(Boolean, nullable=True)  # null = auto-detect, true/false = manual override
    notes = Column(Text, nullable=True, default="")
    # Hash for deduplication on import: account_id|date|amount|label_truncated
    dedup_hash = Column(String, nullable=False, index=True)
    # Source of the transaction: csv | manual | gocardless
    source = Column(String, nullable=False, default="manual", index=True)
    # Stable identifier from the bank aggregator (e.g. GoCardless transactionId).
    # When set, a unique (account_id, external_id) index dedups syncs across runs.
    external_id = Column(String, nullable=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    household = relationship("Household", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category")

    __table_args__ = (
        UniqueConstraint("household_id", "dedup_hash", name="uq_household_dedup"),
        UniqueConstraint("account_id", "external_id", name="uq_account_external_id"),
        Index("ix_tx_household_date", "household_id", "date"),
    )


class Asset(Base):
    """Non-bank asset: real estate, life insurance, PEA, crypto, etc.

    Real-estate-specific fields (purchase_price, surface_m2, notary_fees,
    agency_fees, works_fees, furniture_fees, purchase_date,
    construction_year, ownership_pct, subtype) were added 2026-05-05 to
    feed the Finary-style "Ajouter mon immobilier" wizard. They're all
    optional and only meaningful when type == "real_estate".
    """
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=_uuid)
    type = Column(String, nullable=False)  # real_estate | life_insurance | pea | per | savings_account | crypto | stocks | other_asset
    name = Column(String, nullable=False)
    current_value = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Real-estate enrichment — Finary parity
    subtype = Column(String, nullable=True)              # RP | locative | secondaire | scpi | other
    purchase_price = Column(Float, nullable=True)
    surface_m2 = Column(Float, nullable=True)
    notary_fees = Column(Float, nullable=True)
    agency_fees = Column(Float, nullable=True)
    works_fees = Column(Float, nullable=True)
    furniture_fees = Column(Float, nullable=True)
    purchase_date = Column(Date, nullable=True)
    construction_year = Column(Integer, nullable=True)
    ownership_pct = Column(Float, nullable=True, default=100.0)
    address = Column(String, nullable=True)              # liée à l'emprunt si tu veux

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="assets")
    members = relationship("Member", secondary=asset_members, back_populates="assets")


class Liability(Base):
    """A loan: mortgage, consumer credit, auto loan, etc.

    Enriched fields (added 2026-05-05) drive the Finary-style detail view:
    amortization schedule, mensualité breakdown (capital / intérêts /
    assurance), %-remboursé, coût total. They're all optional — legacy
    rows still render, just without the breakdown.
    """
    __tablename__ = "liabilities"

    id = Column(String, primary_key=True, default=_uuid)
    type = Column(String, nullable=False)  # mortgage | consumer_loan | auto_loan | other_loan
    name = Column(String, nullable=False)
    initial_capital = Column(Float, nullable=False, default=0.0)   # original principal
    remaining_capital = Column(Float, nullable=False, default=0.0) # current outstanding
    monthly_payment = Column(Float, nullable=False, default=0.0)   # full mensualité (P+I+A)
    interest_rate = Column(Float, nullable=False, default=0.0)     # annual rate %
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True, default="")

    # Enriched
    down_payment = Column(Float, nullable=True)            # apport
    insurance_rate = Column(Float, nullable=True)          # annual % of initial capital
    application_fees = Column(Float, nullable=True)        # frais de dossier (one-shot)
    ownership_pct = Column(Float, nullable=True, default=100.0)  # détention de l'emprunt
    duration_months = Column(Integer, nullable=True)       # total duration
    start_date = Column(Date, nullable=True)               # first echéance
    linked_asset_id = Column(String, ForeignKey("assets.id", ondelete="SET NULL"), nullable=True)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="liabilities")
    members = relationship("Member", secondary=liability_members, back_populates="liabilities")
    linked_asset = relationship("Asset", foreign_keys=[linked_asset_id])


class Category(Base):
    """Spending category. Each household gets a default set on creation."""
    __tablename__ = "categories"

    id = Column(String, primary_key=True, default=_uuid)
    slug = Column(String, nullable=False)  # stable identifier: "groceries", "salary", etc.
    name = Column(String, nullable=False)
    color = Column(String, nullable=False, default="#9ca3af")
    icon = Column(String, nullable=False, default="❓")
    type = Column(String, nullable=False)  # income | expense | transfer
    kind = Column(String, nullable=False, default="needs")  # needs | wants | savings (for 50/30/20)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="categories")

    __table_args__ = (
        UniqueConstraint("household_id", "slug", name="uq_household_category_slug"),
    )


class CategorisationRule(Base):
    """Custom regex rules learned from manual category overrides."""
    __tablename__ = "categorisation_rules"

    id = Column(String, primary_key=True, default=_uuid)
    pattern = Column(String, nullable=False)  # regex source
    category_slug = Column(String, nullable=False)
    source = Column(String, default="manual")  # manual | learned
    created_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="rules")


class Budget(Base):
    """A budget cap per category, per household."""
    __tablename__ = "budgets"

    id = Column(String, primary_key=True, default=_uuid)
    category_slug = Column(String, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="budgets")

    __table_args__ = (
        UniqueConstraint("household_id", "category_slug", name="uq_household_budget"),
    )


class Goal(Base):
    """A savings goal (vacation, house deposit, etc.)."""
    __tablename__ = "goals"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    emoji = Column(String, default="🎯")
    target_amount = Column(Float, nullable=False, default=0.0)
    current_amount = Column(Float, nullable=False, default=0.0)
    deadline = Column(Date, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="goals")


class Achievement(Base):
    """Unlocked gamification achievement."""
    __tablename__ = "achievements"

    id = Column(String, primary_key=True, default=_uuid)
    achievement_slug = Column(String, nullable=False)  # first_import, first_member, etc.
    unlocked_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="achievements")

    __table_args__ = (
        UniqueConstraint("household_id", "achievement_slug", name="uq_household_achievement"),
    )


class PasswordResetToken(Base):
    """Single-use token sent to a user's email to reset their password.

    Stored as a SHA-256 hash so a leaked DB row cannot be replayed
    against the live link. Tokens expire after 60 minutes.
    """
    __tablename__ = "password_reset_tokens"

    id = Column(String, primary_key=True, default=_uuid)
    user_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    token_hash = Column(String, nullable=False, index=True)
    expires_at = Column(DateTime, nullable=False)
    used_at = Column(DateTime, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)


class WealthSnapshot(Base):
    """Monthly snapshot of household net worth.

    One row per (household, year-month). Lets the frontend render a real
    patrimoine evolution curve — without it, the only history available
    came from bank-account balances rolled forward from transactions,
    which excluded assets / liabilities valued in the wealth tab.

    The frontend POSTs a snapshot on first load each month (idempotent —
    upserts on the unique constraint), so the timeline is always current.
    """
    __tablename__ = "wealth_snapshots"

    id = Column(String, primary_key=True, default=_uuid)
    month = Column(String, nullable=False)  # 'YYYY-MM'
    captured_at = Column(DateTime, default=datetime.utcnow)

    # All values in EUR, household-level (sum across members).
    net_worth = Column(Float, nullable=False, default=0.0)
    liquid_wealth = Column(Float, nullable=False, default=0.0)
    assets_value = Column(Float, nullable=False, default=0.0)
    liabilities_value = Column(Float, nullable=False, default=0.0)

    # Breakdown — added 2026-05-05 to power the brut / net / financier toggle
    # in the Synthèse view. Nullable for backwards compatibility; older
    # snapshots simply fall back to the aggregate values above.
    real_estate_value = Column(Float, nullable=True)        # subset of assets_value
    financial_assets_value = Column(Float, nullable=True)   # liquid + non-RE assets
    mortgage_debt = Column(Float, nullable=True)            # subset of liabilities_value
    other_debt = Column(Float, nullable=True)               # liabilities - mortgage

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household")

    __table_args__ = (
        UniqueConstraint("household_id", "month", name="uq_household_snapshot_month"),
    )


class BankConnection(Base):
    """A connection to a bank via an aggregator (GoCardless Bank Account Data
    for now). One row per (household, institution) link — owns 1+ accounts.

    The PSD2 consent expires after 90 days max; the user must re-link the bank
    after that. We track expires_at to surface a warning before that point.
    """
    __tablename__ = "bank_connections"

    id = Column(String, primary_key=True, default=_uuid)
    provider = Column(String, nullable=False, default="gocardless")
    institution_id = Column(String, nullable=False)   # provider-side institution id
    institution_name = Column(String, nullable=False)
    institution_logo = Column(String, nullable=True)

    # Provider-side handles
    requisition_id = Column(String, nullable=False, index=True)
    agreement_id = Column(String, nullable=True)
    # Reference we pass to GoCardless so we can correlate the callback
    reference = Column(String, nullable=False, index=True)

    # CR (created, awaiting auth) | LN (linked) | EX (expired) | ER (error) | RJ (rejected)
    status = Column(String, nullable=False, default="CR")
    last_sync_at = Column(DateTime, nullable=True)
    last_sync_error = Column(Text, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=True)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    household = relationship("Household", back_populates="bank_connections")
    account_links = relationship("BankAccountLink", back_populates="connection", cascade="all, delete-orphan")


class BankAccountLink(Base):
    """A specific external account exposed by a BankConnection, mapped to an
    internal Account. One row per (connection, external_account_id).

    `account_id` is nullable because right after the callback we know the
    external accounts but the user hasn't yet picked which internal Account
    each one maps to (or chosen to create a new one).
    """
    __tablename__ = "bank_account_links"

    id = Column(String, primary_key=True, default=_uuid)
    connection_id = Column(String, ForeignKey("bank_connections.id", ondelete="CASCADE"), nullable=False, index=True)
    external_account_id = Column(String, nullable=False, index=True)

    iban = Column(String, nullable=True)
    currency = Column(String, nullable=True, default="EUR")
    owner_name = Column(String, nullable=True)
    display_name = Column(String, nullable=True)  # what the bank calls it

    account_id = Column(String, ForeignKey("accounts.id", ondelete="SET NULL"), nullable=True, index=True)
    last_synced_at = Column(DateTime, nullable=True)

    created_at = Column(DateTime, default=datetime.utcnow)

    connection = relationship("BankConnection", back_populates="account_links")
    account = relationship("Account")

    __table_args__ = (
        UniqueConstraint("connection_id", "external_account_id", name="uq_connection_ext_account"),
    )


# Association table — FixedCharge can be assigned to specific household members
fixed_charge_members = Table(
    "fixed_charge_members",
    Base.metadata,
    Column("fixed_charge_id", String, ForeignKey("fixed_charges.id", ondelete="CASCADE"), primary_key=True),
    Column("member_id", String, ForeignKey("members.id", ondelete="CASCADE"), primary_key=True),
)


class FixedCharge(Base):
    """A stable monthly charge defined by the user.

    Unlike auto-detected recurring expenses (which derive from imported
    transactions), these are explicit and stay constant unless the user
    edits them. They drive the "Reste à vivre" calculation in Suivi
    mensuel: revenus - sum(active fixed charges).

    Activity window:
    - `start_month` (YYYY-MM): the charge is active starting from this
      month. Defaults to the creation month, so an "added today" charge
      counts from now.
    - `end_month` (YYYY-MM, nullable): if set, charge stops being counted
      after that month. Useful for time-bounded subscriptions.
    """
    __tablename__ = "fixed_charges"

    id = Column(String, primary_key=True, default=_uuid)
    name = Column(String, nullable=False)
    amount = Column(Float, nullable=False, default=0.0)
    day_of_month = Column(Integer, nullable=True)  # 1-31 — informational
    category_slug = Column(String, nullable=True)
    start_month = Column(String, nullable=False)   # 'YYYY-MM'
    end_month = Column(String, nullable=True)      # 'YYYY-MM' or null
    notes = Column(Text, nullable=True, default="")

    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    household = relationship("Household", back_populates="fixed_charges")
    members = relationship("Member", secondary=fixed_charge_members)
