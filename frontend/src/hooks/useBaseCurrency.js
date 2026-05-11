// ============================================================================
// useBaseCurrency — user's preferred display currency, stored in localStorage.
// Default = EUR. Listens to other tabs via `storage` event so a change in
// Settings updates every open tab.
// ============================================================================
import { useEffect, useState, useCallback } from 'react';
import { SUPPORTED_CURRENCIES } from '../utils.js';

const KEY = 'trove:base-currency';
const DEFAULT = 'EUR';

const read = () => {
  try {
    const v = localStorage.getItem(KEY);
    return SUPPORTED_CURRENCIES.includes(v) ? v : DEFAULT;
  } catch {
    return DEFAULT;
  }
};

export function useBaseCurrency() {
  const [base, setBase] = useState(read);

  const change = useCallback((next) => {
    if (!SUPPORTED_CURRENCIES.includes(next)) return;
    try { localStorage.setItem(KEY, next); } catch { /* ignore */ }
    setBase(next);
  }, []);

  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === KEY) setBase(read());
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
  }, []);

  return [base, change];
}
