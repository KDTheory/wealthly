"""
Wealthly API — main entry point.

Run locally: uvicorn app.main:app --reload --port 8000
Docs available at http://localhost:8000/docs
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base
from app.routers import auth, members, accounts, transactions, wealth, other, categorize, banks, fixed_charges

logger = logging.getLogger("wealthly")

# Create tables on startup. New tables are picked up automatically; ALTER TABLE
# for new columns on existing tables must be run manually below — SQLAlchemy's
# create_all does not migrate existing schemas.
Base.metadata.create_all(bind=engine)


def _run_lightweight_migrations() -> None:
    """Add columns / constraints introduced after the initial schema.

    Each statement uses IF [NOT] EXISTS so it's safe to run on every boot.
    Postgres-only for the production target; SQLite (local dev) tolerates
    these statements but will error on the unique constraint — that's fine,
    the except clause swallows it because in dev the DB is recreated often.
    """
    is_pg = engine.dialect.name == "postgresql"
    statements: list[str] = []
    if is_pg:
        statements = [
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS source VARCHAR DEFAULT 'manual' NOT NULL",
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS external_id VARCHAR",
            "CREATE INDEX IF NOT EXISTS ix_transactions_source ON transactions (source)",
            "CREATE INDEX IF NOT EXISTS ix_transactions_external_id ON transactions (external_id)",
            # Unique (account_id, external_id) — only enforced when external_id is not null
            # (Postgres treats NULLs as distinct, so duplicates with NULL stay allowed).
            "DO $$ BEGIN "
            "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'uq_account_external_id') THEN "
            "    ALTER TABLE transactions ADD CONSTRAINT uq_account_external_id UNIQUE (account_id, external_id); "
            "  END IF; "
            "END $$;",
        ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                logger.warning("[migrate] skipped statement (%s): %s", stmt[:80], e)


_run_lightweight_migrations()

# Surface GoCardless config status at startup so Railway logs make it obvious
# whether the env vars are loaded inside the container.
if settings.GOCARDLESS_SECRET_ID and settings.GOCARDLESS_SECRET_KEY:
    logger.warning("[gocardless] configured (id=%s…)", settings.GOCARDLESS_SECRET_ID[:8])
else:
    logger.warning(
        "[gocardless] NOT configured — set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY (currently id=%r key=%r)",
        bool(settings.GOCARDLESS_SECRET_ID),
        bool(settings.GOCARDLESS_SECRET_KEY),
    )

app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="Self-hosted family finance tracker — backend API",
)

# CORS — allow the frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Health check (used by Docker healthcheck)
@app.get("/health", tags=["meta"])
def health():
    return {"status": "ok", "version": "2.0.0"}

# Mount all routers
app.include_router(auth.router)
app.include_router(members.router)
app.include_router(accounts.router)
app.include_router(transactions.router)
app.include_router(wealth.router)
app.include_router(other.router)
app.include_router(categorize.router)
app.include_router(banks.router)
app.include_router(fixed_charges.router)
