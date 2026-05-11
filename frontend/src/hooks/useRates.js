// ============================================================================
// useRates — fetch FX rates from Frankfurter (free, ECB-sourced, no API key)
//
// Frankfurter returns rates relative to the `from` currency. We always fetch
// with from=EUR so the table shape is { USD: 1.08, GBP: 0.85, CHF: 0.97, …}.
// EUR is the implicit base (1 EUR = 1 EUR).
//
// Cache strategy: 1-hour localStorage cache so we don't hit the API on every
// render. On stale cache or first run, fetch in background — UI keeps rendering
// with the previous rates (or empty rates → conversion no-ops).
// ============================================================================
import { useEffect, useState, useRef } from 'react';

const CACHE_KEY = 'trove:fx-rates';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour
const FRANKFURTER = 'https://api.frankfurter.app/latest?from=EUR&to=USD,GBP,CHF';

const readCache = () => {
  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    if (!parsed || !parsed.fetchedAt || !parsed.rates) return null;
    if (Date.now() - parsed.fetchedAt > CACHE_TTL_MS) {
      return { rates: parsed.rates, date: parsed.date, stale: true };
    }
    return { rates: parsed.rates, date: parsed.date, stale: false };
  } catch {
    return null;
  }
};

const writeCache = (rates, date) => {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify({
      rates, date, fetchedAt: Date.now(),
    }));
  } catch {
    /* localStorage may be full or disabled — silently ignore */
  }
};

export function useRates() {
  const cached = readCache();
  const [rates, setRates] = useState(cached?.rates || null);
  const [date, setDate] = useState(cached?.date || null);
  const [loading, setLoading] = useState(!cached);
  const fetchedRef = useRef(false);

  useEffect(() => {
    // If cache is fresh and present, nothing to do.
    if (cached && !cached.stale) return;
    // Avoid double-fetch in React strict mode dev / re-renders
    if (fetchedRef.current) return;
    fetchedRef.current = true;

    const ctrl = new AbortController();
    setLoading(true);
    fetch(FRANKFURTER, { signal: ctrl.signal })
      .then(r => r.ok ? r.json() : Promise.reject(new Error(`status ${r.status}`)))
      .then(data => {
        if (!data || !data.rates) return;
        // Frankfurter returns { date: "2026-05-08", base: "EUR", rates: { USD: 1.08, … } }
        setRates(data.rates);
        setDate(data.date);
        writeCache(data.rates, data.date);
      })
      .catch(() => {
        /* swallow — UI keeps rendering with cached or no rates */
      })
      .finally(() => setLoading(false));

    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return { rates, date, loading };
}
