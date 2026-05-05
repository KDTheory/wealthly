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
    created_at = Column(DateTime, default=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True)
    household = relationship("Household", back_populates="transactions")
    account = relationship("Account", back_populates="transactions")
    category = relationship("Category")

    __table_args__ = (
        UniqueConstraint("household_id", "dedup_hash", name="uq_household_dedup"),
        Index("ix_tx_household_date", "household_id", "date"),
    )


class Asset(Base):
    """Non-bank asset: real estate, life insurance, PEA, crypto, etc."""
    __tablename__ = "assets"

    id = Column(String, primary_key=True, default=_uuid)
    type = Column(String, nullable=False)  # real_estate | life_insurance | pea | per | savings_account | crypto | stocks | other_asset
    name = Column(String, nullable=False)
    current_value = Column(Float, nullable=False, default=0.0)
    notes = Column(Text, nullable=True, default="")
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="assets")
    members = relationship("Member", secondary=asset_members, back_populates="assets")


class Liability(Base):
    """A loan: mortgage, consumer credit, auto loan, etc."""
    __tablename__ = "liabilities"

    id = Column(String, primary_key=True, default=_uuid)
    type = Column(String, nullable=False)  # mortgage | consumer_loan | auto_loan | other_loan
    name = Column(String, nullable=False)
    initial_capital = Column(Float, nullable=False, default=0.0)
    remaining_capital = Column(Float, nullable=False, default=0.0)
    monthly_payment = Column(Float, nullable=False, default=0.0)
    interest_rate = Column(Float, nullable=False, default=0.0)
    end_date = Column(Date, nullable=True)
    notes = Column(Text, nullable=True, default="")

    household_id = Column(String, ForeignKey("households.id", ondelete="CASCADE"), nullable=False)
    household = relationship("Household", back_populates="liabilities")
    members = relationship("Member", secondary=liability_members, back_populates="liabilities")


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
