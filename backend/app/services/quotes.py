"""
Live quotes service — Yahoo Finance (free, no API key, public endpoint).

We hit `https://query1.finance.yahoo.com/v8/finance/chart/{symbol}` which
returns the latest market data for any equity / ETF / crypto / forex pair
that Yahoo indexes. The endpoint is officially undocumented but stable for
years; if it ever breaks we'd swap for Twelve Data or stooq.

Cache: simple in-memory TTL of 5 minutes per symbol. Yahoo is fine with
the volume but caching keeps Railway egress + perf low.

Symbols the user can put in Trove:
    AAPL, MSFT, GOOGL              — US stocks
    CW8.PA, ESE.PA, PUST.PA        — Euronext Paris ETFs (Amundi MSCI World, etc.)
    BTC-EUR, ETH-EUR, SOL-USD      — crypto pairs
    EURUSD=X                       — forex (already covered by /rates but works here too)
"""
from __future__ import annotations

import logging
import time
from typing import Dict, List, Optional

import httpx

logger = logging.getLogger(__name__)

YAHOO_URL = "https://query1.finance.yahoo.com/v8/finance/chart/{symbol}"
CACHE_TTL_S = 300  # 5 minutes
USER_AGENT = (
    # Yahoo rejects requests without a browser-like UA.
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"
)

# ── In-memory cache: symbol → (timestamp, payload) ───────────────────────────
_cache: Dict[str, tuple[float, dict]] = {}


def _fetch_one(symbol: str) -> Optional[dict]:
    """Fetch one symbol from Yahoo Finance. Returns a normalized payload
    or None on failure (network error, unknown symbol, malformed response).
    """
    cached = _cache.get(symbol)
    if cached and (time.time() - cached[0]) < CACHE_TTL_S:
        return cached[1]

    try:
        with httpx.Client(timeout=8.0, headers={"User-Agent": USER_AGENT}) as client:
            r = client.get(YAHOO_URL.format(symbol=symbol))
            r.raise_for_status()
            data = r.json()
    except Exception as e:  # noqa: BLE001
        logger.warning("[quotes] fetch failed for %s: %s", symbol, e)
        return None

    try:
        result = data.get("chart", {}).get("result")
        if not result:
            return None
        meta = result[0].get("meta", {})
        price = meta.get("regularMarketPrice")
        prev_close = meta.get("chartPreviousClose") or meta.get("previousClose")
        currency = meta.get("currency")
        if price is None:
            return None

        change_abs = (price - prev_close) if prev_close else None
        change_pct = (change_abs / prev_close * 100) if prev_close else None

        payload = {
            "symbol": symbol,
            "price": float(price),
            "previousClose": float(prev_close) if prev_close is not None else None,
            "change": float(change_abs) if change_abs is not None else None,
            "changePct": float(change_pct) if change_pct is not None else None,
            "currency": currency,
            "exchange": meta.get("exchangeName"),
            "fetchedAt": int(time.time()),
        }
    except Exception as e:  # noqa: BLE001
        logger.warning("[quotes] parse failed for %s: %s", symbol, e)
        return None

    _cache[symbol] = (time.time(), payload)
    return payload


def get_quotes(symbols: List[str]) -> Dict[str, dict]:
    """Fetch quotes for a list of symbols. Returns a dict { symbol: payload },
    only including symbols that resolved successfully. Bad/unknown symbols
    are silently dropped — the frontend falls back to the manual current_value.
    """
    out: Dict[str, dict] = {}
    seen: set[str] = set()
    for s in symbols:
        s = (s or "").strip().upper()
        if not s or s in seen:
            continue
        seen.add(s)
        payload = _fetch_one(s)
        if payload:
            out[s] = payload
    return out
