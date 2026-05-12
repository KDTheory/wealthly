"""Add Enable Banking columns to bank_connections table

Adds the columns used by the Enable Banking (PSD2) integration.
The table may have been created by the GoCardless model (which
Python kept as the last definition) — this migration adds the
Enable Banking columns idempotently.

Revision ID: 0005_enable_banking_columns
Revises: 0004_household_plan
Create Date: 2026-05-12
"""
from typing import Sequence, Union
from alembic import op

revision: str = '0005_enable_banking_columns'
down_revision: Union[str, None] = '0004_household_plan'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def _add_column_if_missing(table: str, column: str, definition: str) -> None:
    op.execute(f"""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = '{table}' AND column_name = '{column}'
            ) THEN
                ALTER TABLE {table} ADD COLUMN {column} {definition};
            END IF;
        END $$;
    """)


def upgrade() -> None:
    # Create bank_connections table if it doesn't exist at all
    op.execute("""
        CREATE TABLE IF NOT EXISTS bank_connections (
            id VARCHAR PRIMARY KEY,
            household_id VARCHAR NOT NULL REFERENCES households(id) ON DELETE CASCADE,
            session_id VARCHAR,
            bank_name VARCHAR NOT NULL DEFAULT '',
            bank_country VARCHAR DEFAULT 'FR',
            status VARCHAR DEFAULT 'pending',
            state VARCHAR,
            accounts_data JSON,
            error_message TEXT,
            last_synced_at TIMESTAMP,
            created_at TIMESTAMP DEFAULT now()
        );
    """)

    # Add Enable Banking columns in case the table already exists with
    # the old GoCardless schema (session_id, bank_name, etc. would be missing).
    _add_column_if_missing("bank_connections", "session_id",    "VARCHAR")
    _add_column_if_missing("bank_connections", "bank_name",     "VARCHAR NOT NULL DEFAULT ''")
    _add_column_if_missing("bank_connections", "bank_country",  "VARCHAR DEFAULT 'FR'")
    _add_column_if_missing("bank_connections", "state",         "VARCHAR")
    _add_column_if_missing("bank_connections", "accounts_data", "JSON")
    _add_column_if_missing("bank_connections", "error_message", "TEXT")
    _add_column_if_missing("bank_connections", "last_synced_at","TIMESTAMP")

    # Index on household_id (may already exist)
    op.execute("""
        CREATE INDEX IF NOT EXISTS ix_bank_connections_household_id
        ON bank_connections (household_id);
    """)


def downgrade() -> None:
    for col in ("session_id", "bank_name", "bank_country", "state",
                "accounts_data", "error_message", "last_synced_at"):
        op.execute(f"""
            DO $$
            BEGIN
                IF EXISTS (
                    SELECT 1 FROM information_schema.columns
                    WHERE table_name = 'bank_connections' AND column_name = '{col}'
                ) THEN
                    ALTER TABLE bank_connections DROP COLUMN {col};
                END IF;
            END $$;
        """)
