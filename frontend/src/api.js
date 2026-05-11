/**
 * API service: all HTTP calls to the Trove backend.
 *
 * Auth: HttpOnly Secure SameSite=None cookie `trove_session` set by the
 * backend on login/register/reset. The browser auto-attaches it on every
 * request thanks to `credentials: 'include'`. JS cannot read it (XSS-safe).
 *
 * Legacy: a localStorage token (`wealthly:token`) is still cleared on logout
 * so existing sessions migrate cleanly. New logins do NOT write to it.
 *
 * Base URL: from VITE_API_URL env var, falls back to /api (proxied by Vite in dev).
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const LEGACY_TOKEN_KEY = 'wealthly:token';

// ============================================================================
// TOKEN MANAGEMENT (legacy — cookie auth supersedes this)
// ============================================================================
export const getToken = () => localStorage.getItem(LEGACY_TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(LEGACY_TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(LEGACY_TOKEN_KEY);

// ============================================================================
// CORE FETCH WRAPPER
// ============================================================================
async function request(method, path, body = null) {
  // In demo mode the UI is fed from demoData.js; never hit the backend.
  if (typeof window !== 'undefined' && window.localStorage.getItem('wealthly:demo') === '1') {
    if (method === 'GET') return null;
    throw new Error('Mode démo : modifications non enregistrées');
  }

  const headers = { 'Content-Type': 'application/json' };
  // Legacy Bearer header — only sent if the localStorage token still exists
  // (users who logged in before the cookie migration). Cookie auth is the
  // primary path; this exists purely so existing sessions don't get kicked
  // out on the day of the upgrade.
  const legacyToken = getToken();
  if (legacyToken) headers['Authorization'] = `Bearer ${legacyToken}`;

  const opts = {
    method,
    headers,
    credentials: 'include',  // critical: lets the browser send the auth cookie
  };
  if (body !== null) opts.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, opts);
  } catch (err) {
    throw new Error('Impossible de joindre le serveur. Vérifie que le backend tourne.');
  }

  if (response.status === 401) {
    // We're not authenticated. If we previously had a session, scrub the
    // legacy token and reload so the user lands on the login screen cleanly.
    if (legacyToken) {
      clearToken();
      window.location.reload();
    }
    // Otherwise this is a fresh credential failure (wrong password etc.) —
    // let it bubble up so the form can show the error.
    let errMsg = 'Session expirée';
    try { const d = await response.clone().json(); errMsg = d?.detail || errMsg; } catch {}
    throw new Error(errMsg);
  }

  if (response.status === 204) return null; // No Content

  let data;
  try {
    data = await response.json();
  } catch {
    if (!response.ok) throw new Error(`Erreur ${response.status}`);
    return null;
  }

  if (!response.ok) {
    const detail = data?.detail || data?.message || `Erreur ${response.status}`;
    throw new Error(typeof detail === 'string' ? detail : JSON.stringify(detail));
  }

  return data;
}

const get = (path) => request('GET', path);
const post = (path, body) => request('POST', path, body);
const put = (path, body) => request('PUT', path, body);
const del = (path) => request('DELETE', path);

// ============================================================================
// AUTH
// ============================================================================
export const auth = {
  register: (email, password, fullName, householdName) =>
    post('/auth/register', {
      email,
      password,
      full_name: fullName,
      household_name: householdName,
    }),
  login: (email, password) => post('/auth/login', { email, password }),
  logout: () => post('/auth/logout', {}),
  me: () => get('/auth/me'),
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => post('/auth/reset-password', { token, new_password: newPassword }),
};

// ============================================================================
// ADMIN
// ============================================================================
export const admin = {
  stats:        ()              => get('/admin/stats'),
  metrics:      ()              => get('/admin/metrics'),
  growth:       ()              => get('/admin/growth'),
  authEvents:   (limit = 100, kind = null) => get(`/admin/auth-events?limit=${limit}${kind ? `&kind=${encodeURIComponent(kind)}` : ''}`),
  users:        ()              => get('/admin/users'),
  households:   ()              => get('/admin/households'),
  toggleUser:   (id)            => request('PUT',    `/admin/users/${id}/toggle`),
  deleteUser:   (id)            => request('DELETE', `/admin/users/${id}`),
  updatePlan:   (householdId, plan) => request('PUT', `/admin/households/${householdId}/plan`, { plan }),
  resetPassword:(id)            => request('POST',   `/admin/users/${id}/reset-password`),
};

// ============================================================================
// MEMBERS
// ============================================================================
export const members = {
  list: () => get('/members'),
  create: (m) => post('/members', m),
  update: (id, m) => put(`/members/${id}`, m),
  delete: (id) => del(`/members/${id}`),
};

// ============================================================================
// ACCOUNTS
// ============================================================================
export const accounts = {
  list: () => get('/accounts'),
  create: (a) => post('/accounts', a),
  update: (id, a) => put(`/accounts/${id}`, a),
  delete: (id) => del(`/accounts/${id}`),
};

// ============================================================================
// TRANSACTIONS
// ============================================================================
export const transactions = {
  list: (accountId = null) => get(accountId ? `/transactions?account_id=${accountId}` : '/transactions'),
  create: (t) => post('/transactions', t),
  bulkImport: (accountId, txs) => post('/transactions/import', { account_id: accountId, transactions: txs }),
  update: (id, t) => put(`/transactions/${id}`, t),
  delete: (id) => del(`/transactions/${id}`),
};

// ============================================================================
// WEALTH
// ============================================================================
export const assets = {
  list: () => get('/assets'),
  create: (a) => post('/assets', a),
  update: (id, a) => put(`/assets/${id}`, a),
  delete: (id) => del(`/assets/${id}`),
};

export const liabilities = {
  list: () => get('/liabilities'),
  create: (l) => post('/liabilities', l),
  update: (id, l) => put(`/liabilities/${id}`, l),
  delete: (id) => del(`/liabilities/${id}`),
};

// Monthly net-worth snapshots (patrimoine history)
export const wealthSnapshots = {
  list: () => get('/wealth/snapshots'),
  upsert: (payload) => post('/wealth/snapshots', payload),
  delete: (id) => del(`/wealth/snapshots/${id}`),
};

// ============================================================================
// CATEGORIES, BUDGETS, GOALS, ACHIEVEMENTS, RULES
// ============================================================================
export const categories = {
  list: () => get('/categories'),
  update: (slug, c) => put(`/categories/${slug}`, c),
};

export const budgets = {
  list: () => get('/budgets'),
  set: (categorySlug, amount) => post('/budgets', { category_slug: categorySlug, amount }),
  delete: (slug) => del(`/budgets/${slug}`),
};

export const goals = {
  list: () => get('/goals'),
  create: (g) => post('/goals', g),
  update: (id, g) => put(`/goals/${id}`, g),
  delete: (id) => del(`/goals/${id}`),
};

export const achievements = {
  list: () => get('/achievements'),
  unlock: (slug) => post(`/achievements/${slug}`, {}),
};

export const rules = {
  list: () => get('/rules'),
  create: (r) => post('/rules', r),
  delete: (id) => del(`/rules/${id}`),
};

// ============================================================================
// AI CATEGORIZATION
// ============================================================================
export const categorizeAI = {
  // transactions: [{label, amount}] -> {results: {label: slug}, ai_used, ai_available}
  categorize: (transactions) => post('/categorize', { transactions }),
};

// ============================================================================
// LIVE QUOTES (Yahoo Finance — stocks, ETFs, crypto)
// ============================================================================
export const quotes = {
  // tickers: ["AAPL", "CW8.PA", "BTC-EUR"] -> { AAPL: {price, changePct, ...}, ... }
  get: (tickers) => get(`/quotes?tickers=${encodeURIComponent(tickers.join(','))}`),
};

// ============================================================================
// FIXED CHARGES (charges fixes stables — loyer, abonnements…)
// ============================================================================
export const fixedCharges = {
  list: () => get('/fixed-charges'),
  create: (fc) => post('/fixed-charges', fc),
  update: (id, fc) => put(`/fixed-charges/${id}`, fc),
  delete: (id) => del(`/fixed-charges/${id}`),
};

// ============================================================================
// BANK CONNECTIONS (GoCardless aggregator)
// ============================================================================
export const banks = {
  listInstitutions: (country = 'FR') => get(`/banks/institutions?country=${country}`),
  connect: (institutionId) => post('/banks/connect', { institution_id: institutionId }),
  callback: (ref) => get(`/banks/callback?ref=${encodeURIComponent(ref)}`),
  listConnections: () => get('/banks/connections'),
  map: (connectionId, mappings) => post(`/banks/connections/${connectionId}/map`, { mappings }),
  sync: (connectionId) => post(`/banks/connections/${connectionId}/sync`, {}),
  syncAll: () => post('/banks/sync-all', {}),
  delete: (connectionId) => del(`/banks/connections/${connectionId}`),
};

// ============================================================================
// MIGRATION FROM v2 JSON BACKUP
// ============================================================================
export const migrate = {
  importJson: (jsonData) => post('/migrate/import-json', jsonData),
};

// ============================================================================
// ENABLE BANKING — open banking sync
// ============================================================================
export const banking = {
  /** List available banks in a country (default FR) */
  listBanks: (country = 'FR') => get(`/banking/banks?country=${country}`),

  /** Initiate connection → returns {redirect_url, connection_id, state} */
  connect: (bankName, bankCountry = 'FR') =>
    post('/banking/connect', { bank_name: bankName, bank_country: bankCountry }),

  /** Complete after OAuth callback — pass state param from URL */
  complete: (state) => post('/banking/complete', { state }),

  /** Sync transactions for a connection */
  sync: (connectionId, daysBack = 90) =>
    post(`/banking/sync/${connectionId}?days_back=${daysBack}`),

  /** List all connections */
  listConnections: () => get('/banking/connections'),

  /** Delete a connection */
  deleteConnection: (id) => del(`/banking/connections/${id}`),
};
