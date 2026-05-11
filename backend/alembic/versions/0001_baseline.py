"""baseline — schema currently maintained by Base.metadata.create_all

This is an intentionally empty marker revision. The current schema
(17 tables, all defined in app/models.py) was historically created by
SQLAlchemy's create_all() at startup. We keep that startup call as a
fresh-DB safety net for now and use this baseline as the alembic anchor:
new migrations layered on top will use op.add_column / op.create_table
the normal way.

The startup hook in main.py auto-stamps this revision the first time it
runs against a database that has tables but no alembic_version row,
so existing prod databases (Supabase) start "at head" without ever
running a migration that conflicts with their existing schema.

Revision ID: 0001_baseline
Revises:
Create Date: 2026-05-06
"""
from typing import Sequence, Union


revision: str = "0001_baseline"
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # Marker only — the schema is created by Base.metadata.create_all()
    # at app startup. See app/main.py.
    pass


def downgrade() -> None:
    pass
