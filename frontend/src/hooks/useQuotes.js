// ============================================================================
// useQuotes — fetches live market prices for a list of tickers via the
// /quotes backend endpoint (which proxies Yahoo Finance with a 5-min cache).
//
// Returns: { quotes, loading, refresh }
//   quotes  — { "AAPL": { price, changePct, currency, ... }, ... }
//   loading — true while a fetch is in flight
//   refresh — call to force a re-fetch (skips client-side cache)
//
// Polling cadence: 5 min — matches the backend cache TTL so we never hit
// Yahoo more than once per cadence per symbol.
// ============================================================================
import { useEffect, useRef, useState, useMemo } from 'react';
import * as api from '../api.js';

const POLL_INTERVAL_MS = 5 * 60 * 1000; // 5 minutes

export function useQuotes(tickers) {
  // Stabilise the input so re-renders with the same logical list don't refetch.
  const stableTickers = useMemo(() => {
    if (!tickers || !tickers.length) return [];
    return [...new Set(tickers.map(t => (t || '').trim().toUpperCase()).filter(Boolean))].sort();
  }, [tickers]);
  const key = stableTickers.join(',');

  const [quotes, setQuotes] = useState({});
  const [loading, setLoading] = useState(false);
  const inFlight = useRef(false);

  const doFetch = async () => {
    if (!stableTickers.length || inFlight.current) return;
    inFlight.current = true;
    setLoading(true);
    try {
      const data = await api.quotes.get(stableTickers);
      if (data && typeof data === 'object') {
        setQuotes(prev => ({ ...prev, ...data }));
      }
    } catch (e) {
      // swallow — UI keeps rendering with previous quotes
      // eslint-disable-next-line no-console
      console.warn('[useQuotes] fetch failed', e);
    } finally {
      inFlight.current = false;
      setLoading(false);
    }
  };

  useEffect(() => {
    doFetch();
    if (!stableTickers.length) return undefined;
    const id = setInterval(doFetch, POLL_INTERVAL_MS);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return { quotes, loading, refresh: doFetch };
}
