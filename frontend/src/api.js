/**
 * API service: all HTTP calls to the Wealthly backend.
 *
 * Auth: stores JWT in localStorage under 'wealthly:token'.
 * Base URL: from VITE_API_URL env var, falls back to /api (proxied by Vite in dev).
 */

const API_BASE = import.meta.env.VITE_API_URL || '/api';
const TOKEN_KEY = 'wealthly:token';

// ============================================================================
// TOKEN MANAGEMENT
// ============================================================================
export const getToken = () => localStorage.getItem(TOKEN_KEY);
export const setToken = (token) => localStorage.setItem(TOKEN_KEY, token);
export const clearToken = () => localStorage.removeItem(TOKEN_KEY);

// ============================================================================
// CORE FETCH WRAPPER
// ============================================================================
async function request(method, path, body = null) {
  const headers = { 'Content-Type': 'application/json' };
  const token = getToken();
  if (token) headers['Authorization'] = `Bearer ${token}`;

  const opts = { method, headers };
  if (body !== null) opts.body = JSON.stringify(body);

  let response;
  try {
    response = await fetch(`${API_BASE}${path}`, opts);
  } catch (err) {
    throw new Error('Impossible de joindre le serveur. Vérifie que le backend tourne.');
  }

  if (response.status === 401) {
    clearToken();
    window.location.reload();
    throw new Error('Session expirée');
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
  me: () => get('/auth/me'),
  forgotPassword: (email) => post('/auth/forgot-password', { email }),
  resetPassword: (token, newPassword) => post('/auth/reset-password', { token, new_password: newPassword }),
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
// MIGRATION FROM v2 JSON BACKUP
// ============================================================================
export const migrate = {
  importJson: (jsonData) => post('/migrate/import-json', jsonData),
};
