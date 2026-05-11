"""seed platform admins — promote kdtheory + Raphyy31

Sets is_admin=True for the two platform founders.
Runs automatically on Railway startup via alembic upgrade head.
Safe to run multiple times (idempotent UPDATE).

Revision ID: 0003_seed_platform_admins
Revises: 0002_security_phase1
Create Date: 2026-05-10
"""
from typing import Sequence, Union
from alembic import op

revision: str = '0003_seed_platform_admins'
down_revision: Union[str, None] = '0002_security_phase1'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

PLATFORM_ADMINS = [
    'k.darmon31@gmail.com',
    'raphael.darmon1@gmail.com',
]


def upgrade() -> None:
    for email in PLATFORM_ADMINS:
        op.execute(
            f"UPDATE users SET is_admin = TRUE WHERE email = '{email}'"
        )


def downgrade() -> None:
    for email in PLATFORM_ADMINS:
        op.execute(
            f"UPDATE users SET is_admin = FALSE WHERE email = '{email}'"
        )
