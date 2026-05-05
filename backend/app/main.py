"""
Wealthly API — main entry point.

Run locally: uvicorn app.main:app --reload --port 8000
Docs available at http://localhost:8000/docs
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import engine, Base
from app.routers import auth, members, accounts, transactions, wealth, other, categorize

# Create tables on startup (simple approach for self-hosted apps).
# For production with migrations, use Alembic instead.
Base.metadata.create_all(bind=engine)

app = FastAPI(
    title=settings.APP_NAME,
    version="2.0.0",
    description="Self-hosted family finance tracker — backend API",
)

# CORS — allow the frontend to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
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
