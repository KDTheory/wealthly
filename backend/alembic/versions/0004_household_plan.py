"""household plan field + set admin plan for founders

Adds households.plan VARCHAR (solo/pro/family/admin, default 'solo').
Sets plan='admin' for households belonging to the two platform founders.

Revision ID: 0004_household_plan
Revises: 0003_seed_platform_admins
Create Date: 2026-05-10
"""
from typing import Sequence, Union
from alembic import op

revision: str = '0004_household_plan'
down_revision: Union[str, None] = '0003_seed_platform_admins'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PLATFORM_ADMINS = [
    'k.darmon31@gmail.com',
    'raphael.darmon1@gmail.com',
]


def upgrade() -> None:
    # Add plan column if not already there (idempotent)
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'households' AND column_name = 'plan'
            ) THEN
                ALTER TABLE households ADD COLUMN plan VARCHAR NOT NULL DEFAULT 'solo';
            END IF;
        END $$;
    """)

    # Set plan='admin' for founder households
    for email in PLATFORM_ADMINS:
        op.execute(f"""
            UPDATE households SET plan = 'admin'
            WHERE id IN (
                SELECT household_id FROM users WHERE email = '{email}'
            )
        """)


def downgrade() -> None:
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'households' AND column_name = 'plan'
            ) THEN ALTER TABLE households DROP COLUMN plan; END IF;
        END $$;
    """)
