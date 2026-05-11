"""security phase 1 — auth_events table + user admin fields

Adds the tables and columns introduced by the security Phase 1:
  - auth_events table (append-only audit log)
  - users.full_name       VARCHAR (not null, default '')
  - users.is_active       BOOLEAN (not null, default TRUE)
  - users.is_admin        BOOLEAN (not null, default FALSE)

Written defensively with IF NOT EXISTS / IF NOT EXISTS column-level guards
so it is safe to run on a fresh DB where create_all() already created
everything, and on an existing DB that is missing these additions.

Revision ID: 0002_security_phase1
Revises: 0001_baseline
Create Date: 2026-05-10
"""
from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa

revision: str = '0002_security_phase1'
down_revision: Union[str, None] = '0001_baseline'
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # ── auth_events table ────────────────────────────────────────────────────
    op.execute("""
        CREATE TABLE IF NOT EXISTS auth_events (
            id          VARCHAR PRIMARY KEY,
            user_id     VARCHAR REFERENCES users(id) ON DELETE SET NULL,
            email       VARCHAR,
            kind        VARCHAR NOT NULL,
            success     BOOLEAN NOT NULL DEFAULT TRUE,
            ip          VARCHAR,
            user_agent  TEXT,
            detail      TEXT,
            created_at  TIMESTAMP WITHOUT TIME ZONE DEFAULT NOW()
        )
    """)

    # Indexes on auth_events (IF NOT EXISTS requires PG 9.5+, Supabase runs PG 15)
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_events_user_id   ON auth_events (user_id)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_events_email     ON auth_events (email)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_events_kind      ON auth_events (kind)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_events_success   ON auth_events (success)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_events_ip        ON auth_events (ip)")
    op.execute("CREATE INDEX IF NOT EXISTS ix_auth_events_created_at ON auth_events (created_at)")

    # ── users — new columns ──────────────────────────────────────────────────
    # Use DO $$ blocks so the migration is idempotent (column already exists on
    # fresh DBs where create_all() ran before alembic).
    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'full_name'
            ) THEN
                ALTER TABLE users ADD COLUMN full_name VARCHAR NOT NULL DEFAULT '';
            END IF;
        END $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'is_active'
            ) THEN
                ALTER TABLE users ADD COLUMN is_active BOOLEAN NOT NULL DEFAULT TRUE;
            END IF;
        END $$;
    """)

    op.execute("""
        DO $$
        BEGIN
            IF NOT EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'is_admin'
            ) THEN
                ALTER TABLE users ADD COLUMN is_admin BOOLEAN NOT NULL DEFAULT FALSE;
            END IF;
        END $$;
    """)


def downgrade() -> None:
    # Downgrade is destructive — drop the audit log and revert user columns.
    # Only run this intentionally in a dev environment.
    op.execute("DROP TABLE IF EXISTS auth_events")
    op.execute("""
        DO $$
        BEGIN
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'is_admin'
            ) THEN ALTER TABLE users DROP COLUMN is_admin; END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'is_active'
            ) THEN ALTER TABLE users DROP COLUMN is_active; END IF;
            IF EXISTS (
                SELECT 1 FROM information_schema.columns
                WHERE table_name = 'users' AND column_name = 'full_name'
            ) THEN ALTER TABLE users DROP COLUMN full_name; END IF;
        END $$;
    """)
