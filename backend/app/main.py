"""
Wealthly API — main entry point.

Run locally: uvicorn app.main:app --reload --port 8000
Docs available at http://localhost:8000/docs
"""
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.config import settings
from app.database import engine, Base
from app.rate_limit import limiter, rate_limit_handler
from app.routers import auth, members, accounts, transactions, wealth, other, categorize, banks, fixed_charges, quotes, admin

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
            # Liability enrichment for the Finary-style detail view
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS down_payment DOUBLE PRECISION",
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS insurance_rate DOUBLE PRECISION",
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS application_fees DOUBLE PRECISION",
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS ownership_pct DOUBLE PRECISION DEFAULT 100.0",
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS duration_months INTEGER",
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS start_date DATE",
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS linked_asset_id VARCHAR",
            # FK constraint after the column exists
            "DO $$ BEGIN "
            "  IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_liability_linked_asset') THEN "
            "    ALTER TABLE liabilities ADD CONSTRAINT fk_liability_linked_asset "
            "      FOREIGN KEY (linked_asset_id) REFERENCES assets(id) ON DELETE SET NULL; "
            "  END IF; "
            "END $$;",
            # Wealth snapshot breakdown — drives the brut/net/financier toggle
            "ALTER TABLE wealth_snapshots ADD COLUMN IF NOT EXISTS real_estate_value DOUBLE PRECISION",
            "ALTER TABLE wealth_snapshots ADD COLUMN IF NOT EXISTS financial_assets_value DOUBLE PRECISION",
            "ALTER TABLE wealth_snapshots ADD COLUMN IF NOT EXISTS mortgage_debt DOUBLE PRECISION",
            "ALTER TABLE wealth_snapshots ADD COLUMN IF NOT EXISTS other_debt DOUBLE PRECISION",
            # Asset enrichment for the Finary-style immo wizard
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS subtype VARCHAR",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_price DOUBLE PRECISION",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS surface_m2 DOUBLE PRECISION",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS notary_fees DOUBLE PRECISION",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS agency_fees DOUBLE PRECISION",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS works_fees DOUBLE PRECISION",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS furniture_fees DOUBLE PRECISION",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS purchase_date DATE",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS construction_year INTEGER",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS ownership_pct DOUBLE PRECISION DEFAULT 100.0",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS address VARCHAR",
            # Account cashflow role — drives income/expense exclusion in the
            # monthly aggregator. Default 'principal' keeps existing accounts
            # behaving exactly as before until the user opts in.
            "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS role VARCHAR DEFAULT 'principal' NOT NULL",
            "CREATE INDEX IF NOT EXISTS ix_accounts_role ON accounts (role)",
            # Manual override on the auto-detected internal-transfer flag
            "ALTER TABLE transactions ADD COLUMN IF NOT EXISTS is_transfer_override BOOLEAN",
            # ISO 4217 currency on every monetary entity. Default EUR keeps
            # existing rows behaving exactly as before; new records can pick
            # USD / GBP / CHF and the frontend will live-convert via Frankfurter.
            "ALTER TABLE accounts ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'EUR' NOT NULL",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'EUR' NOT NULL",
            "ALTER TABLE liabilities ADD COLUMN IF NOT EXISTS currency VARCHAR DEFAULT 'EUR' NOT NULL",
            # Live-priced assets: ticker symbol + quantity. When both are set,
            # the frontend will display quantity × live_price (Yahoo Finance)
            # instead of the manually-entered current_value.
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS ticker VARCHAR",
            "ALTER TABLE assets ADD COLUMN IF NOT EXISTS quantity DOUBLE PRECISION",
            "CREATE INDEX IF NOT EXISTS ix_assets_ticker ON assets (ticker)",
        ]
    with engine.begin() as conn:
        for stmt in statements:
            try:
                conn.execute(text(stmt))
            except Exception as e:
                logger.warning("[migrate] skipped statement (%s): %s", stmt[:80], e)


_run_lightweight_migrations()


def _alembic_sync() -> None:
    """Bring the alembic_version table into agreement with the live schema.

    Two cases the startup hook handles automatically so deploys are safe:
    1. Existing prod DB (Supabase) with tables but no alembic_version row →
       stamp 'head'. Treats the current schema as the alembic baseline so
       future migrations can run cleanly.
    2. Any DB already at some revision → upgrade head, applying any new
       migrations shipped in this deploy.

    Non-fatal: if alembic isn't installed or alembic.ini is missing, we log
    and continue; create_all() + the lightweight migrations above already
    keep the DB usable.
    """
    try:
        from alembic.config import Config as AlembicConfig
        from alembic import command as alembic_command
    except ImportError:
        logger.warning("[alembic] alembic package not installed — skipping sync")
        return

    import os
    project_root = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    cfg_path = os.path.join(project_root, "alembic.ini")
    if not os.path.exists(cfg_path):
        logger.warning("[alembic] %s missing — skipping sync", cfg_path)
        return

    cfg = AlembicConfig(cfg_path)
    cfg.set_main_option("script_location", os.path.join(project_root, "alembic"))

    try:
        with engine.connect() as conn:
            has_version_table = conn.execute(text(
                "SELECT 1 FROM information_schema.tables "
                "WHERE table_name = 'alembic_version'"
            )).first() is not None
        if not has_version_table:
            logger.info("[alembic] no alembic_version table — stamping head")
            alembic_command.stamp(cfg, "head")
        else:
            alembic_command.upgrade(cfg, "head")
    except Exception as e:
        logger.warning("[alembic] sync failed (non-fatal): %s", e)


_alembic_sync()

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

# Per-IP rate limiting (auth routes only — see app.rate_limit + routers.auth)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, rate_limit_handler)

# CORS — allow the frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_origin_regex=settings.CORS_ORIGIN_REGEX,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["X-CSRF-Token"],
)


# Security headers — applied to every response
from app.security import apply_security_headers


@app.middleware("http")
async def security_headers_mw(request, call_next):
    response = await call_next(request)
    apply_security_headers(response)
    return response

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
app.include_router(quotes.router)
app.include_router(admin.router)
