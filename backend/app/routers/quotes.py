"""
GET /quotes?tickers=AAPL,CW8.PA,BTC-EUR

Thin HTTP wrapper around app.services.quotes.get_quotes. Auth-required so we
don't proxy Yahoo Finance for the open internet — only authenticated Trove
users hit this endpoint.
"""
from fastapi import APIRouter, Depends, HTTPException, Query

from app.auth import get_current_user
from app.models import User
from app.services.quotes import get_quotes

router = APIRouter(prefix="/quotes", tags=["quotes"])


@router.get("")
def quotes(
    tickers: str = Query(..., description="Comma-separated symbols, e.g. AAPL,CW8.PA"),
    user: User = Depends(get_current_user),
):
    if not tickers:
        raise HTTPException(status_code=400, detail="tickers requis")
    symbols = [s.strip() for s in tickers.split(",") if s.strip()]
    if not symbols:
        raise HTTPException(status_code=400, detail="tickers vides")
    if len(symbols) > 50:
        raise HTTPException(status_code=400, detail="trop de tickers (max 50)")
    return get_quotes(symbols)
