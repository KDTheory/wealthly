import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar, ComposedChart } from 'recharts';
import { Upload, Plus, TrendingUp, TrendingDown, Wallet, Home, Coins, CreditCard, Users, Settings, Search, Download, Trash2, Edit3, Check, X, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle, Repeat, Calendar, ArrowUpDown, Eye, EyeOff, Sparkles, PiggyBank, Bitcoin, Banknote, Landmark, BarChart3, Target, Heart, Sun, Moon, Award, Zap, Activity, ArrowUp, ArrowDown, Minus, PartyPopper, Lightbulb, Bell, ChevronUp, Play, Lock, Unlock, LogOut, Cloud, RefreshCw, FileText, Calculator } from 'lucide-react';
import * as api from './api.js';
import { generateBilanPdf } from './pdfReport.js';
import TaxSimulator from './TaxSimulator.jsx';
import { getDemoData } from './demoData.js';

// ============================================================================
// CONSTANTS
// ============================================================================

const APP_NAME = 'Wealthly';

const STORAGE_KEYS = {
  MEMBERS: 'w2:members',
  ACCOUNTS: 'w2:accounts',
  TRANSACTIONS: 'w2:transactions',
  ASSETS: 'w2:assets',
  LIABILITIES: 'w2:liabilities',
  CATEGORIES: 'w2:categories',
  RULES: 'w2:rules',
  MAPPINGS: 'w2:mappings',
  BUDGETS: 'w2:budgets',
  RECURRING_OVERRIDES: 'w2:recurring_overrides',
  GOALS: 'w2:goals',
  ACHIEVEMENTS: 'w2:achievements',
  SETTINGS: 'w2:settings',
  ONBOARDED: 'w2:onboarded',
  ACTIVE_MEMBER: 'w2:active_member',
  THEME: 'w2:theme',
};

const DEFAULT_CATEGORIES = [
  { id: 'salary', name: 'Salaire', color: '#10b981', type: 'income', icon: '💼', kind: 'needs' },
  { id: 'invest_income', name: 'Revenus financiers', color: '#059669', type: 'income', icon: '📈', kind: 'needs' },
  { id: 'other_income', name: 'Autres revenus', color: '#34d399', type: 'income', icon: '💰', kind: 'needs' },
  { id: 'housing', name: 'Logement', color: '#f97316', type: 'expense', icon: '🏠', kind: 'needs' },
  { id: 'utilities', name: 'Énergie & Internet', color: '#fb923c', type: 'expense', icon: '⚡', kind: 'needs' },
  { id: 'insurance', name: 'Assurances', color: '#ea580c', type: 'expense', icon: '🛡️', kind: 'needs' },
  { id: 'subscriptions', name: 'Abonnements', color: '#a855f7', type: 'expense', icon: '📱', kind: 'wants' },
  { id: 'groceries', name: 'Courses', color: '#22c55e', type: 'expense', icon: '🛒', kind: 'needs' },
  { id: 'restaurants', name: 'Restaurants', color: '#ec4899', type: 'expense', icon: '🍽️', kind: 'wants' },
  { id: 'transport', name: 'Transport', color: '#3b82f6', type: 'expense', icon: '🚗', kind: 'needs' },
  { id: 'fuel', name: 'Carburant', color: '#2563eb', type: 'expense', icon: '⛽', kind: 'needs' },
  { id: 'health', name: 'Santé', color: '#ef4444', type: 'expense', icon: '⚕️', kind: 'needs' },
  { id: 'shopping', name: 'Shopping', color: '#d946ef', type: 'expense', icon: '🛍️', kind: 'wants' },
  { id: 'leisure', name: 'Loisirs', color: '#8b5cf6', type: 'expense', icon: '🎭', kind: 'wants' },
  { id: 'travel', name: 'Voyages', color: '#06b6d4', type: 'expense', icon: '✈️', kind: 'wants' },
  { id: 'children', name: 'Enfants', color: '#f59e0b', type: 'expense', icon: '👶', kind: 'needs' },
  { id: 'education', name: 'Éducation', color: '#6366f1', type: 'expense', icon: '📚', kind: 'needs' },
  { id: 'taxes', name: 'Impôts & Taxes', color: '#7c2d12', type: 'expense', icon: '🏛️', kind: 'needs' },
  { id: 'cash', name: 'Retrait DAB', color: '#64748b', type: 'expense', icon: '💵', kind: 'wants' },
  { id: 'transfer', name: 'Virements internes', color: '#94a3b8', type: 'transfer', icon: '🔄', kind: 'savings' },
  { id: 'savings', name: 'Épargne', color: '#0891b2', type: 'transfer', icon: '🏦', kind: 'savings' },
  { id: 'investment', name: 'Investissements', color: '#0e7490', type: 'transfer', icon: '📊', kind: 'savings' },
  { id: 'fees', name: 'Frais bancaires', color: '#dc2626', type: 'expense', icon: '💳', kind: 'needs' },
  { id: 'uncategorized', name: 'Non catégorisé', color: '#9ca3af', type: 'expense', icon: '❓', kind: 'wants' },
];

const DEFAULT_RULES = [
  { pattern: /carrefour|leclerc|lidl|auchan|monoprix|franprix|intermarch|casino|super u|biocoop|naturalia/i, categoryId: 'groceries' },
  { pattern: /uber eats|deliveroo|just eat|mcdonald|burger king|kfc|subway|starbucks|paul |brioche dor|krispy kreme/i, categoryId: 'restaurants' },
  { pattern: /restaurant|brasserie|bistrot|pizzeria|sushi|kebab|tacos/i, categoryId: 'restaurants' },
  { pattern: /netflix|spotify|disney|prime video|deezer|apple\.com\/bill|youtube premium|canal\+|salto|amazon prime/i, categoryId: 'subscriptions' },
  { pattern: /icloud|google one|dropbox|microsoft 365|adobe|github|comit.o/i, categoryId: 'subscriptions' },
  { pattern: /sfr|orange|free mobile|bouygues|red by sfr|sosh|prixtel/i, categoryId: 'utilities' },
  { pattern: /edf |engie|total energies|enedis|grdf|veolia|suez/i, categoryId: 'utilities' },
  { pattern: /loyer|location|fonciere|syndic|charges copro/i, categoryId: 'housing' },
  { pattern: /maaf|axa|maif|matmut|generali|allianz|groupama|gan |mma /i, categoryId: 'insurance' },
  { pattern: /sncf|ratp|navigo|blablacar|flixbus|ouigo|trainline|tgv inoui/i, categoryId: 'transport' },
  { pattern: /uber(?!\s*eats)|bolt|free now|heetch|kapten/i, categoryId: 'transport' },
  { pattern: /total |shell|esso |bp |intermarch.*carbur|leclerc.*carbur|carbur/i, categoryId: 'fuel' },
  { pattern: /pharmacie|doctolib|mutuelle|hopital|laboratoire|opticien|dentiste/i, categoryId: 'health' },
  { pattern: /amazon|cdiscount|fnac|darty|leroy merlin|castorama|ikea|but |conforama/i, categoryId: 'shopping' },
  { pattern: /zalando|asos|h&m|zara|uniqlo|decathlon|sephora|nocibe|sport2000/i, categoryId: 'shopping' },
  { pattern: /cinema|ugc|pathe|gaumont|theatre|concert|fnac spectacles|ticketmaster/i, categoryId: 'leisure' },
  { pattern: /booking|airbnb|hotel|hotels\.com|expedia|ryanair|easyjet|air france|transavia|ifa hotels/i, categoryId: 'travel' },
  { pattern: /salaire|virement employeur|paie /i, categoryId: 'salary' },
  { pattern: /impot|tresor public|dgfip|taxe foncier|taxe habitation|cfe /i, categoryId: 'taxes' },
  { pattern: /retrait|dab |distributeur|retrait d.esp.ces/i, categoryId: 'cash' },
  { pattern: /virement.*compte|vir compte|de:.*vers:|epargne|livret a|ldds|pel |pee |per |recharge sur apple pay/i, categoryId: 'savings' },
  { pattern: /pea |bourse|action |titre |sicav|opcvm|etf /i, categoryId: 'investment' },
  { pattern: /commission|frais|cotisation carte|agios/i, categoryId: 'fees' },
  { pattern: /ecole|creche|nounou|assistante mater|cantine|periscolaire|centre aere/i, categoryId: 'children' },
  { pattern: /cultura|amazon kindle|udemy|coursera|formation/i, categoryId: 'education' },
];

const BANK_PROFILES = {
  revolut_fr: {
    name: 'Revolut',
    detect: (headers) => {
      const lower = headers.map(h => h.toLowerCase());
      return lower.includes('type') && lower.includes('produit') && lower.includes('description') && lower.includes('montant') && lower.includes('frais');
    },
    mapping: { date: 'Date de début', label: 'Description', amount: 'Montant', balance: 'Solde', fees: 'Frais', currency: 'Devise', state: 'État' },
    options: { skipPending: true, includeFeesInAmount: true },
  },
  credit_agricole: {
    name: 'Crédit Agricole',
    detect: (headers) => {
      const joined = headers.join(' ').toLowerCase();
      return /date.*op/i.test(joined) && /libell/i.test(joined) && (/d.bit/i.test(joined) || /cr.dit/i.test(joined));
    },
    mapping: null,
  },
  boursorama: {
    name: 'Boursorama',
    detect: (headers) => {
      const joined = headers.join(' ').toLowerCase();
      return /dateop/i.test(joined) || (/^date$/i.test(headers[0] || '') && /libell/i.test(joined) && /montant/i.test(joined));
    },
    mapping: null,
  },
};

const ASSET_TYPES = [
  { id: 'real_estate', name: 'Immobilier', icon: Home, color: '#f97316', description: 'Résidence principale, locatif' },
  { id: 'life_insurance', name: 'Assurance vie', icon: Heart, color: '#ec4899', description: 'Contrats AV (multi-supports, fonds €)' },
  { id: 'pea', name: 'PEA', icon: BarChart3, color: '#10b981', description: 'Plan Épargne Actions (max 150k€)' },
  { id: 'per', name: 'PER', icon: Target, color: '#06b6d4', description: 'Plan Épargne Retraite' },
  { id: 'savings_account', name: 'Livret épargne', icon: PiggyBank, color: '#0891b2', description: 'Livret A, LDDS, LEP, PEL' },
  { id: 'crypto', name: 'Cryptomonnaies', icon: Bitcoin, color: '#f59e0b', description: 'BTC, ETH, autres' },
  { id: 'stocks', name: 'Titres / CTO', icon: Landmark, color: '#3b82f6', description: 'Compte-titres ordinaire' },
  { id: 'other_asset', name: 'Autre actif', icon: Coins, color: '#6b7280', description: 'Or, art, parts SCPI…' },
];

// Maps asset type → broad class for wealth allocation view
const ASSET_CLASS_MAP = {
  real_estate:     { class: 'Immobilier',   color: '#f97316' },
  life_insurance:  { class: 'Épargne',      color: '#ec4899' },
  pea:             { class: 'Placements',   color: '#10b981' },
  per:             { class: 'Retraite',     color: '#06b6d4' },
  savings_account: { class: 'Épargne',      color: '#0891b2' },
  crypto:          { class: 'Alternatifs',  color: '#f59e0b' },
  stocks:          { class: 'Placements',   color: '#3b82f6' },
  other_asset:     { class: 'Divers',       color: '#6b7280' },
};

const LIABILITY_TYPES = [
  { id: 'mortgage', name: 'Crédit immobilier', icon: Home, color: '#7c2d12' },
  { id: 'consumer_loan', name: 'Crédit conso', icon: CreditCard, color: '#dc2626' },
  { id: 'auto_loan', name: 'Crédit auto', icon: CreditCard, color: '#ea580c' },
  { id: 'other_loan', name: 'Autre prêt', icon: Banknote, color: '#6b7280' },
];

const ACHIEVEMENT_DEFS = [
  { id: 'first_import', name: 'Premier pas', description: 'Premier import CSV', icon: '🎯' },
  { id: 'first_member', name: 'En famille', description: 'Plusieurs membres ajoutés', icon: '👨‍👩‍👧' },
  { id: 'first_asset', name: 'Patrimoine bâti', description: 'Premier actif renseigné', icon: '🏛️' },
  { id: 'first_budget', name: 'Cap budget', description: 'Premier budget défini', icon: '🎯' },
  { id: 'positive_month', name: 'Mois vert', description: 'Premier mois avec solde positif', icon: '🌱' },
  { id: 'three_streak', name: 'Trio gagnant', description: '3 mois positifs d\'affilée', icon: '🔥' },
  { id: 'budget_master', name: 'Maître du budget', description: 'Tous les budgets respectés sur un mois', icon: '🏆' },
  { id: 'big_saver', name: 'Gros écureuil', description: 'Plus de 20% épargnés sur un mois', icon: '🐿️' },
  { id: 'wealth_10k', name: 'Cap 10k€', description: 'Patrimoine net dépasse 10 000€', icon: '✨' },
  { id: 'wealth_100k', name: 'Cap 100k€', description: 'Patrimoine net dépasse 100 000€', icon: '💎' },
];

// ============================================================================
// STORAGE — localStorage for client-side cache (UI prefs).
// Real data lives on the server; this just caches preferences locally.
// ============================================================================
const storage = {
  async get(key, defaultValue = null) {
    try {
      const v = localStorage.getItem(key);
      return v !== null ? JSON.parse(v) : defaultValue;
    } catch { return defaultValue; }
  },
  async set(key, value) {
    try { localStorage.setItem(key, JSON.stringify(value)); return true; }
    catch (e) { console.error('Storage error:', e); return false; }
  },
  async delete(key) {
    try { localStorage.removeItem(key); return true; }
    catch { return false; }
  },
};

// ============================================================================
// UTILITIES
// ============================================================================
const formatCurrency = (amount, options = {}) => {
  const { compact = false, sign = false, currency = 'EUR' } = options;
  const formatted = new Intl.NumberFormat('fr-FR', {
    style: 'currency',
    currency,
    notation: compact ? 'compact' : 'standard',
    maximumFractionDigits: compact ? 1 : 2,
    minimumFractionDigits: compact ? 0 : 2,
  }).format(Math.abs(amount));
  if (sign && amount > 0) return '+' + formatted;
  if (amount < 0) return '-' + formatted;
  return formatted;
};

const formatDate = (dateStr, options = {}) => {
  const { format = 'short' } = options;
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  if (format === 'short') return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
  if (format === 'long') return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  if (format === 'monthYear') return d.toLocaleDateString('fr-FR', { month: 'short', year: '2-digit' });
  if (format === 'monthLong') return d.toLocaleDateString('fr-FR', { month: 'long', year: 'numeric' });
  if (format === 'day') return d.toLocaleDateString('fr-FR', { day: 'numeric' });
  return d.toLocaleDateString('fr-FR');
};

const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

const dayOfMonth = (dateStr) => {
  const d = new Date(dateStr);
  return d.getDate();
};

const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

const hashTransaction = (tx) => `${tx.accountId}|${tx.date}|${tx.amount.toFixed(2)}|${(tx.label || '').slice(0, 50).toLowerCase().trim()}`;

const detectDelimiter = (text) => {
  const sample = text.split('\n').slice(0, 5).join('\n');
  const counts = { ';': (sample.match(/;/g) || []).length, ',': (sample.match(/,/g) || []).length, '\t': (sample.match(/\t/g) || []).length };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

const parseCSVLine = (line, delimiter) => {
  const result = [];
  let current = '', inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const c = line[i];
    if (c === '"') {
      if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
      else inQuotes = !inQuotes;
    } else if (c === delimiter && !inQuotes) { result.push(current); current = ''; }
    else current += c;
  }
  result.push(current);
  return result.map(s => s.trim());
};

const parseCSV = (text) => {
  if (text.charCodeAt(0) === 0xFEFF) text = text.slice(1);
  const delimiter = detectDelimiter(text);
  const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
  if (lines.length === 0) return { headers: [], rows: [], delimiter };
  let headerIdx = 0;
  for (let i = 0; i < Math.min(5, lines.length); i++) {
    const cells = parseCSVLine(lines[i], delimiter);
    const numeric = cells.filter(c => /^[-+]?\d+([.,]\d+)?$/.test(c.replace(/\s/g, ''))).length;
    if (numeric / cells.length < 0.3 && cells.length >= 2) { headerIdx = i; break; }
  }
  const headers = parseCSVLine(lines[headerIdx], delimiter);
  const rows = [];
  for (let i = headerIdx + 1; i < lines.length; i++) {
    const cells = parseCSVLine(lines[i], delimiter);
    if (cells.length < 2) continue;
    const row = {};
    headers.forEach((h, idx) => { row[h] = cells[idx] || ''; });
    rows.push(row);
  }
  return { headers, rows, delimiter };
};

const detectBankProfile = (headers) => {
  for (const [id, profile] of Object.entries(BANK_PROFILES)) {
    if (profile.detect(headers)) return { id, profile };
  }
  return null;
};

const autoDetectMapping = (headers) => {
  const mapping = { date: null, label: null, amount: null, debit: null, credit: null, balance: null };
  const lowerHeaders = headers.map(h => h.toLowerCase());
  for (let i = 0; i < headers.length; i++) {
    const h = lowerHeaders[i];
    if (!mapping.date && /date.*op|date.*val|^date$|date.*compt|date de d.but/i.test(h)) mapping.date = headers[i];
    else if (!mapping.label && /libell|description|d.tail|nature|op.ration|memo/i.test(h)) mapping.label = headers[i];
    else if (!mapping.debit && /^d.bit|montant.*d.bit/i.test(h)) mapping.debit = headers[i];
    else if (!mapping.credit && /^cr.dit|montant.*cr.dit/i.test(h)) mapping.credit = headers[i];
    else if (!mapping.amount && /montant|amount/i.test(h)) mapping.amount = headers[i];
    else if (!mapping.balance && /solde|balance/i.test(h)) mapping.balance = headers[i];
  }
  if (!mapping.date) for (const h of headers) if (/date/i.test(h)) { mapping.date = h; break; }
  return mapping;
};

const parseAmount = (str) => {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  let s = String(str).replace(/[€$£\s\u00A0]/g, '').trim();
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  else if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

const parseDate = (str) => {
  if (!str) return null;
  str = String(str).trim();
  let m = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/);
  if (m) {
    let [_, d, mo, y] = m;
    if (y.length === 2) y = (parseInt(y) > 50 ? '19' : '20') + y;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  m = str.match(/^(\d{4})[\/\-](\d{1,2})[\/\-](\d{1,2})/);
  if (m) {
    const [_, y, mo, d] = m;
    return `${y}-${mo.padStart(2, '0')}-${d.padStart(2, '0')}`;
  }
  return null;
};

const applyMapping = (rows, mapping, accountId, options = {}) => {
  return rows.map(row => {
    const date = parseDate(row[mapping.date]);
    if (!date) return null;
    const label = String(row[mapping.label] || '').trim();
    let amount = 0;
    if (mapping.amount) amount = parseAmount(row[mapping.amount]);
    else if (mapping.debit || mapping.credit) {
      const debit = parseAmount(row[mapping.debit]);
      const credit = parseAmount(row[mapping.credit]);
      amount = credit - debit;
      if (debit === 0 && credit === 0) return null;
    }
    if (options.skipPending && mapping.state && row[mapping.state] && /en cours|pending/i.test(row[mapping.state])) return null;
    if (options.includeFeesInAmount && mapping.fees) {
      const fees = parseAmount(row[mapping.fees]);
      if (fees > 0 && amount < 0) amount -= fees;
    }
    if (amount === 0 && !label) return null;
    return {
      id: generateId(),
      accountId,
      date,
      label,
      amount,
      categoryId: null,
      isManualCategory: false,
      isFixed: null,
      notes: '',
    };
  }).filter(Boolean);
};

const categorize = (tx, customRules = []) => {
  const allRules = [...customRules, ...DEFAULT_RULES];
  for (const rule of allRules) {
    let pattern = rule.pattern;
    if (typeof pattern === 'string') {
      try { pattern = new RegExp(pattern, 'i'); } catch { continue; }
    }
    if (pattern.test(tx.label || '')) return rule.categoryId;
  }
  if (tx.amount > 1500) return 'salary';
  return 'uncategorized';
};

const detectRecurring = (transactions, overrides = {}) => {
  const groups = {};
  transactions.forEach(tx => {
    if (tx.amount >= 0) return;
    const labelKey = (tx.label || '').toLowerCase().replace(/\d+/g, '').slice(0, 25).trim();
    const amountKey = Math.round(Math.abs(tx.amount) / 10) * 10;
    const key = `${labelKey}|${amountKey}`;
    if (!groups[key]) groups[key] = [];
    groups[key].push(tx);
  });
  const recurringIds = new Set();
  const recurringGroups = [];
  Object.entries(groups).forEach(([key, group]) => {
    if (group.length < 2) return;
    const months = new Set(group.map(t => monthKey(t.date)));
    if (months.size >= 2) {
      group.forEach(t => recurringIds.add(t.id));
      const avgAmount = group.reduce((s, t) => s + t.amount, 0) / group.length;
      const avgDay = Math.round(group.reduce((s, t) => s + dayOfMonth(t.date), 0) / group.length);
      const sortedByDate = [...group].sort((a, b) => b.date.localeCompare(a.date));
      recurringGroups.push({
        key,
        label: sortedByDate[0].label,
        avgAmount,
        avgDay,
        count: group.length,
        months: months.size,
        categoryId: sortedByDate[0].categoryId,
        accountId: sortedByDate[0].accountId,
        lastDate: sortedByDate[0].date,
        transactions: group,
      });
    }
  });
  // Apply overrides (manual fixed/not-fixed marks)
  transactions.forEach(tx => {
    if (overrides[tx.id] === true) recurringIds.add(tx.id);
    if (overrides[tx.id] === false) recurringIds.delete(tx.id);
  });
  return { recurringIds, recurringGroups };
};
// ============================================================================
// MAIN APP
// ============================================================================
export default function WealthlyApp({ demoMode = false, onExitDemo }) {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [view, setView] = useState('dashboard');
  const [theme, setTheme] = useState('light');
  const [members, setMembers] = useState([]);
  const [activeMemberId, setActiveMemberId] = useState('all');
  const [accounts, setAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [assets, setAssets] = useState([]);
  const [liabilities, setLiabilities] = useState([]);
  const [categories, setCategories] = useState(DEFAULT_CATEGORIES);
  const [customRules, setCustomRules] = useState([]);
  const [columnMappings, setColumnMappings] = useState({});
  const [budgets, setBudgets] = useState({});
  const [recurringOverrides, setRecurringOverrides] = useState({});
  const [goals, setGoals] = useState([]);
  const [achievements, setAchievements] = useState([]);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [toast, setToast] = useState(null);
  const [confettiActive, setConfettiActive] = useState(false);

  const [importFile, setImportFile] = useState(null);
  const [importStep, setImportStep] = useState('upload');
  const [parsedData, setParsedData] = useState(null);
  const [detectedBank, setDetectedBank] = useState(null);
  const [currentMapping, setCurrentMapping] = useState({});
  const [importAccount, setImportAccount] = useState({ name: '', bank: '', memberIds: [], type: 'checking', initialBalance: 0 });
  const [importPreview, setImportPreview] = useState([]);

  // ============================================================================
  // API ↔ Frontend mapping helpers (snake_case ↔ camelCase)
  // ============================================================================
  // Convert an Account from API shape to frontend shape (memberIds, initialBalance...)
  const accountFromApi = (a) => ({
    id: a.id,
    name: a.name,
    bank: a.bank,
    type: a.type,
    initialBalance: a.initial_balance,
    memberIds: a.member_ids || [],
    currentBalance: a.current_balance,
  });
  const accountToApi = (a) => ({
    name: a.name,
    bank: a.bank,
    type: a.type,
    initial_balance: parseFloat(a.initialBalance) || 0,
    member_ids: a.memberIds || [],
  });
  // Transactions
  const txFromApi = (t) => ({
    id: t.id,
    accountId: t.account_id,
    date: t.date,
    label: t.label || '',
    amount: t.amount,
    categoryId: t.category_slug, // we treat slugs as ids on the frontend
    isManualCategory: t.is_manual_category,
    isRecurringOverride: t.is_recurring_override,
    notes: t.notes || '',
  });
  const txToApi = (t) => ({
    account_id: t.accountId,
    date: t.date,
    label: t.label || '',
    amount: parseFloat(t.amount),
    category_slug: t.categoryId || null,
    is_manual_category: t.isManualCategory || false,
    is_recurring_override: t.isRecurringOverride ?? null,
    notes: t.notes || '',
  });
  // Assets
  const assetFromApi = (a) => ({
    id: a.id,
    type: a.type,
    name: a.name,
    currentValue: a.current_value,
    notes: a.notes || '',
    memberIds: a.member_ids || [],
    updatedAt: a.updated_at,
  });
  const assetToApi = (a) => ({
    type: a.type,
    name: a.name,
    current_value: parseFloat(a.currentValue) || 0,
    notes: a.notes || '',
    member_ids: a.memberIds || [],
  });
  // Liabilities
  const liaFromApi = (l) => ({
    id: l.id,
    type: l.type,
    name: l.name,
    initialCapital: l.initial_capital,
    remainingCapital: l.remaining_capital,
    monthlyPayment: l.monthly_payment,
    interestRate: l.interest_rate,
    endDate: l.end_date,
    notes: l.notes || '',
    memberIds: l.member_ids || [],
  });
  const liaToApi = (l) => ({
    type: l.type,
    name: l.name,
    initial_capital: parseFloat(l.initialCapital) || 0,
    remaining_capital: parseFloat(l.remainingCapital) || 0,
    monthly_payment: parseFloat(l.monthlyPayment) || 0,
    interest_rate: parseFloat(l.interestRate) || 0,
    end_date: l.endDate || null,
    notes: l.notes || '',
    member_ids: l.memberIds || [],
  });
  // Goals
  const goalFromApi = (g) => ({
    id: g.id,
    name: g.name,
    emoji: g.emoji || '🎯',
    target: g.target_amount,
    current: g.current_amount,
    deadline: g.deadline,
  });
  const goalToApi = (g) => ({
    name: g.name,
    emoji: g.emoji || '🎯',
    target_amount: parseFloat(g.target) || 0,
    current_amount: parseFloat(g.current) || 0,
    deadline: g.deadline || null,
  });
  // Categories from API have a different shape — flatten
  const categoryFromApi = (c) => ({
    id: c.slug, // we use slug as id throughout the frontend
    name: c.name,
    color: c.color,
    icon: c.icon,
    type: c.type,
    kind: c.kind,
  });

  // Reload everything from the server (or from demoData.js in demo mode).
  const reloadAll = useCallback(async () => {
    if (demoMode) {
      const d = getDemoData();
      setMembers(d.members);
      setAccounts(d.accounts);
      setTransactions(d.transactions);
      setAssets(d.assets);
      setLiabilities(d.liabilities);
      setCategories(DEFAULT_CATEGORIES);
      setBudgets(d.budgets);
      setGoals(d.goals);
      setAchievements(d.achievements);
      setCustomRules(d.customRules);
      return;
    }
    try {
      const [memList, accList, txList, astList, liaList, catList, budList, goalList, achList, ruleList] = await Promise.all([
        api.members.list(),
        api.accounts.list(),
        api.transactions.list(),
        api.assets.list(),
        api.liabilities.list(),
        api.categories.list(),
        api.budgets.list(),
        api.goals.list(),
        api.achievements.list(),
        api.rules.list(),
      ]);
      setMembers(memList);
      setAccounts(accList.map(accountFromApi));
      setTransactions(txList.map(txFromApi));
      setAssets(astList.map(assetFromApi));
      setLiabilities(liaList.map(liaFromApi));
      const cats = (catList || []).map(categoryFromApi);
      setCategories(cats.length > 0 ? cats : DEFAULT_CATEGORIES);
      // Budgets: convert array to dict {category_slug: amount}
      const budDict = {};
      (budList || []).forEach(b => { budDict[b.category_slug] = b.amount; });
      setBudgets(budDict);
      setGoals((goalList || []).map(goalFromApi));
      setAchievements((achList || []).map(a => a.achievement_slug));
      // Custom rules
      setCustomRules((ruleList || []).map(r => ({ pattern: r.pattern, categoryId: r.category_slug, source: r.source, _id: r.id })));
    } catch (err) {
      showToast('Erreur de chargement : ' + err.message, 'error');
    }
  }, [demoMode]);

  // Load
  useEffect(() => {
    (async () => {
      // Load local UI prefs first (instant)
      const [ov, am, th] = await Promise.all([
        storage.get(STORAGE_KEYS.RECURRING_OVERRIDES, {}),
        storage.get(STORAGE_KEYS.ACTIVE_MEMBER, 'all'),
        storage.get(STORAGE_KEYS.THEME, 'light'),
      ]);
      setRecurringOverrides(ov);
      setActiveMemberId(am);
      setTheme(th);
      setColumnMappings(await storage.get(STORAGE_KEYS.MAPPINGS, {}));
      // Then fetch server data (or load demo dataset if applicable)
      await reloadAll();
      if (demoMode) {
        setOnboarded(true);
      } else {
        // First-time check: onboarded if at least one member exists
        try {
          await api.auth.me();
          const memList = await api.members.list();
          const hasMembers = memList && memList.length > 0;
          setOnboarded(hasMembers);
        } catch {
          setOnboarded(false);
        }
      }
      setLoading(false);
    })();
  }, [reloadAll]);

  // persist is used only for client-side UI prefs (theme, active member, recurring overrides, mappings)
  const persist = useCallback(async (key, value) => { await storage.set(key, value); }, []);

  useEffect(() => { if (!loading) persist(STORAGE_KEYS.ACTIVE_MEMBER, activeMemberId); }, [activeMemberId, loading, persist]);
  useEffect(() => { if (!loading) persist(STORAGE_KEYS.THEME, theme); }, [theme, loading, persist]);

  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  };

  const triggerConfetti = () => {
    setConfettiActive(true);
    setTimeout(() => setConfettiActive(false), 3000);
  };

  // Achievement unlocking
  const unlockAchievement = useCallback(async (id) => {
    if (achievements.includes(id)) return;
    try {
      await api.achievements.unlock(id);
      setAchievements(prev => [...prev, id]);
      const def = ACHIEVEMENT_DEFS.find(a => a.id === id);
      if (def) {
        showToast(`🏆 Succès débloqué : ${def.name}`, 'success');
        triggerConfetti();
      }
    } catch (e) {
      console.error('Achievement unlock failed:', e);
    }
  }, [achievements]);

  // ===== Visibility filtering =====
  const visibleAccountIds = useMemo(() => {
    if (activeMemberId === 'all') return new Set(accounts.map(a => a.id));
    return new Set(accounts.filter(a => (a.memberIds || []).includes(activeMemberId)).map(a => a.id));
  }, [accounts, activeMemberId]);

  const visibleAccounts = useMemo(() => accounts.filter(a => visibleAccountIds.has(a.id)), [accounts, visibleAccountIds]);
  const visibleTransactions = useMemo(() => transactions.filter(t => visibleAccountIds.has(t.accountId)), [transactions, visibleAccountIds]);
  const visibleAssets = useMemo(() => activeMemberId === 'all' ? assets : assets.filter(a => (a.memberIds || []).includes(activeMemberId)), [assets, activeMemberId]);
  const visibleLiabilities = useMemo(() => activeMemberId === 'all' ? liabilities : liabilities.filter(l => (l.memberIds || []).includes(activeMemberId)), [liabilities, activeMemberId]);

  const memberShare = useCallback((item) => {
    if (!item.memberIds || item.memberIds.length === 0) return 1;
    if (activeMemberId === 'all') return 1;
    if (!item.memberIds.includes(activeMemberId)) return 0;
    return 1 / item.memberIds.length;
  }, [activeMemberId]);

  // ===== Computed values =====
  const accountBalances = useMemo(() => {
    const balances = {};
    accounts.forEach(a => { balances[a.id] = a.initialBalance || 0; });
    transactions.forEach(t => { balances[t.accountId] = (balances[t.accountId] || 0) + t.amount; });
    return balances;
  }, [accounts, transactions]);

  const liquidWealth = useMemo(() => visibleAccounts.reduce((sum, a) => sum + (accountBalances[a.id] || 0) * memberShare(a), 0), [visibleAccounts, accountBalances, memberShare]);
  const assetsValue = useMemo(() => visibleAssets.reduce((sum, a) => sum + (parseFloat(a.currentValue) || 0) * memberShare(a), 0), [visibleAssets, memberShare]);
  const liabilitiesValue = useMemo(() => visibleLiabilities.reduce((sum, l) => sum + (parseFloat(l.remainingCapital) || 0) * memberShare(l), 0), [visibleLiabilities, memberShare]);
  const netWorth = liquidWealth + assetsValue - liabilitiesValue;

  // ---- Wealth snapshots (patrimoine history) ----
  const [wealthHistory, setWealthHistory] = useState([]);
  const lastSnapshotKeyRef = useRef(null);

  // Load snapshot history once on mount.
  useEffect(() => {
    let cancelled = false;
    api.wealthSnapshots.list().then((rows) => {
      if (!cancelled && Array.isArray(rows)) setWealthHistory(rows);
    }).catch(() => {});
    return () => { cancelled = true; };
  }, []);

  // Auto-upsert the current month's snapshot whenever the net-worth math
  // resolves to a meaningful value. Gated by a ref so we don't spam the
  // backend on every re-render — we only re-post if the month or the
  // computed totals changed materially.
  useEffect(() => {
    if (!Number.isFinite(netWorth)) return;
    if (liquidWealth === 0 && assetsValue === 0 && liabilitiesValue === 0) return;
    const now = new Date();
    const month = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    // Round to 1 € so micro-fluctuations don't trigger noisy POSTs.
    const key = `${month}|${Math.round(netWorth)}|${Math.round(liquidWealth)}|${Math.round(assetsValue)}|${Math.round(liabilitiesValue)}`;
    if (lastSnapshotKeyRef.current === key) return;
    lastSnapshotKeyRef.current = key;
    const handle = setTimeout(() => {
      api.wealthSnapshots.upsert({
        month,
        net_worth: Number(netWorth.toFixed(2)),
        liquid_wealth: Number(liquidWealth.toFixed(2)),
        assets_value: Number(assetsValue.toFixed(2)),
        liabilities_value: Number(liabilitiesValue.toFixed(2)),
      }).then((row) => {
        setWealthHistory((prev) => {
          const others = prev.filter((s) => s.month !== row.month);
          return [...others, row].sort((a, b) => a.month.localeCompare(b.month));
        });
      }).catch(() => {});
    }, 1500); // debounce — wait for any settling re-renders before posting
    return () => clearTimeout(handle);
  }, [netWorth, liquidWealth, assetsValue, liabilitiesValue]);

  const recurringData = useMemo(() => detectRecurring(visibleTransactions, recurringOverrides), [visibleTransactions, recurringOverrides]);
  const recurringIds = recurringData.recurringIds;
  const recurringGroups = recurringData.recurringGroups;

  const monthlyEvolution = useMemo(() => {
    const monthly = {};
    const sortedTx = [...visibleTransactions].sort((a, b) => a.date.localeCompare(b.date));
    const months = new Set();
    sortedTx.forEach(t => months.add(monthKey(t.date)));
    const sortedMonths = Array.from(months).sort();
    let runningTotal = visibleAccounts.reduce((sum, a) => sum + (a.initialBalance || 0) * memberShare(a), 0);
    sortedMonths.forEach(m => { monthly[m] = { month: m, income: 0, expenses: 0, net: 0, balance: 0, fixed: 0, variable: 0, savings: 0 }; });
    sortedTx.forEach(t => {
      const m = monthKey(t.date);
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const sharedAmount = t.amount * share;
      const cat = categories.find(c => c.id === t.categoryId);
      if (t.amount > 0) monthly[m].income += sharedAmount;
      else {
        const absShared = Math.abs(sharedAmount);
        monthly[m].expenses += absShared;
        if (recurringIds.has(t.id)) monthly[m].fixed += absShared;
        else monthly[m].variable += absShared;
        if (cat?.kind === 'savings') monthly[m].savings += absShared;
      }
      monthly[m].net += sharedAmount;
    });
    sortedMonths.forEach(m => { runningTotal += monthly[m].net; monthly[m].balance = runningTotal; });
    return Object.values(monthly);
  }, [visibleTransactions, visibleAccounts, accounts, categories, recurringIds, memberShare]);

  const currentMonth = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  }, []);

  const thisMonthStats = useMemo(() => monthlyEvolution.find(x => x.month === currentMonth) || { income: 0, expenses: 0, net: 0, fixed: 0, variable: 0, savings: 0 }, [monthlyEvolution, currentMonth]);

  // 50/30/20 breakdown
  const fiftyThirtyTwenty = useMemo(() => {
    const breakdown = { needs: 0, wants: 0, savings: 0, total: 0 };
    visibleTransactions.forEach(t => {
      if (monthKey(t.date) !== currentMonth) return;
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const cat = categories.find(c => c.id === t.categoryId);
      if (t.amount < 0) {
        const abs = Math.abs(t.amount) * share;
        if (cat?.kind === 'needs') breakdown.needs += abs;
        else if (cat?.kind === 'wants') breakdown.wants += abs;
        else if (cat?.kind === 'savings') breakdown.savings += abs;
        breakdown.total += abs;
      }
    });
    return breakdown;
  }, [visibleTransactions, accounts, categories, currentMonth, memberShare]);

  // Category breakdown for current month, with previous 3-month avg
  const categoryAnalysis = useMemo(() => {
    const result = {};
    const lastMonths = monthlyEvolution.slice(-4, -1).map(m => m.month);
    categories.filter(c => c.type === 'expense').forEach(cat => {
      result[cat.id] = { current: 0, history: {}, avg3m: 0 };
      lastMonths.forEach(m => { result[cat.id].history[m] = 0; });
    });
    visibleTransactions.forEach(t => {
      if (t.amount >= 0) return;
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const m = monthKey(t.date);
      const abs = Math.abs(t.amount) * share;
      const catId = t.categoryId || 'uncategorized';
      if (!result[catId]) result[catId] = { current: 0, history: {}, avg3m: 0 };
      if (m === currentMonth) result[catId].current += abs;
      else if (lastMonths.includes(m)) result[catId].history[m] = (result[catId].history[m] || 0) + abs;
    });
    Object.values(result).forEach(v => {
      const histVals = Object.values(v.history);
      v.avg3m = histVals.length > 0 ? histVals.reduce((s, x) => s + x, 0) / histVals.length : 0;
    });
    return result;
  }, [visibleTransactions, categories, currentMonth, monthlyEvolution, accounts, memberShare]);

  // Number of budget categories the user has overspent this month — drives
  // the red dot on the "Budgets" nav button so the user notices without
  // having to open the page.
  const budgetsOverCount = useMemo(() => {
    let count = 0;
    for (const [catId, budget] of Object.entries(budgets)) {
      if (budget > 0 && (categoryAnalysis[catId]?.current || 0) > budget) count += 1;
    }
    return count;
  }, [budgets, categoryAnalysis]);

  // Anomaly detection: categories that doubled vs avg
  const anomalies = useMemo(() => {
    return Object.entries(categoryAnalysis)
      .filter(([catId, data]) => data.avg3m > 30 && data.current > data.avg3m * 1.5)
      .map(([catId, data]) => {
        const cat = categories.find(c => c.id === catId);
        return {
          categoryId: catId,
          name: cat?.name,
          icon: cat?.icon,
          color: cat?.color,
          current: data.current,
          avg: data.avg3m,
          ratio: data.current / data.avg3m,
        };
      })
      .sort((a, b) => b.ratio - a.ratio);
  }, [categoryAnalysis, categories]);

  // Cashflow projection: based on day of month + recurring + avg
  const cashflowProjection = useMemo(() => {
    const today = new Date();
    const isCurrentMonth = currentMonth === `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
    if (!isCurrentMonth) return null;
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const dayNum = today.getDate();
    const elapsed = dayNum / daysInMonth;
    const projected = { income: thisMonthStats.income / Math.max(elapsed, 0.05), expenses: thisMonthStats.expenses / Math.max(elapsed, 0.05) };
    return {
      daysLeft: daysInMonth - dayNum,
      elapsed: Math.round(elapsed * 100),
      projectedIncome: projected.income,
      projectedExpenses: projected.expenses,
      projectedNet: projected.income - projected.expenses,
    };
  }, [thisMonthStats, currentMonth]);

  // ============================================================================
  // ACTIONS — all hit the API
  // ============================================================================
  const completeOnboarding = async (data) => {
    try {
      // Create members on the server
      for (const m of data.members) {
        await api.members.create({ name: m.name, role: m.role, color: m.color });
      }
      await reloadAll();
      setOnboarded(true);
      if (data.members.length > 1) unlockAchievement('first_member');
      showToast('🎉 Foyer configuré !', 'success');
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error');
    }
  };

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setImportFile(file);
    const text = await file.text();
    const parsed = parseCSV(text);
    setParsedData(parsed);
    const detected = detectBankProfile(parsed.headers);
    setDetectedBank(detected);
    if (detected && detected.profile.mapping) {
      setCurrentMapping(detected.profile.mapping);
      setImportAccount(prev => ({ ...prev, bank: detected.profile.name }));
    } else {
      setCurrentMapping(autoDetectMapping(parsed.headers));
    }
    setImportStep('mapping');
  };

  const proceedToAccountStep = () => {
    if (!currentMapping.date || (!currentMapping.amount && (!currentMapping.debit || !currentMapping.credit))) {
      showToast('Mappez au minimum la colonne Date et Montant (ou Débit + Crédit)', 'warning');
      return;
    }
    setImportStep('account');
  };

  const proceedToPreview = async () => {
    if (!importAccount.name) { showToast('Donnez un nom à ce compte', 'warning'); return; }
    if (!importAccount.memberIds || importAccount.memberIds.length === 0) { showToast('Assignez ce compte à au moins un membre', 'warning'); return; }
    let accountId;
    const existing = accounts.find(a => a.name === importAccount.name && a.bank === importAccount.bank);
    accountId = existing ? existing.id : generateId();
    const options = detectedBank ? (detectedBank.profile.options || {}) : {};
    const txs = applyMapping(parsedData.rows, currentMapping, accountId, options);

    // Pass 1: local regex categorization (instant)
    txs.forEach(t => { t.categoryId = categorize(t, customRules); });

    // Pass 2: AI categorization for uncategorized transactions
    const uncategorized = txs.filter(t => t.categoryId === 'uncategorized' && t.label);
    if (uncategorized.length > 0) {
      setImportStep('preview');
      setImportPreview(txs); // show immediately while AI runs
      try {
        const res = await api.categorizeAI.categorize(
          uncategorized.map(t => ({ label: t.label, amount: t.amount }))
        );
        if (res.ai_used) {
          txs.forEach(t => {
            if (t.categoryId === 'uncategorized' && res.results[t.label] && res.results[t.label] !== 'uncategorized') {
              t.categoryId = res.results[t.label];
              t.aiCategorized = true;
            }
          });
          const aiCount = txs.filter(t => t.aiCategorized).length;
          showToast(`✨ ${aiCount} transaction${aiCount > 1 ? 's' : ''} catégorisée${aiCount > 1 ? 's' : ''} par IA`, 'success');
        }
      } catch {
        // AI unavailable — silent fallback, uncategorized stays as-is
      }
      setImportPreview([...txs]);
    } else {
      setImportPreview(txs);
      setImportStep('preview');
    }
  };

  const confirmImport = async () => {
    try {
      let accountId;
      const existing = accounts.find(a => a.name === importAccount.name && a.bank === importAccount.bank);
      if (existing) {
        accountId = existing.id;
      } else {
        // Create new account
        const created = await api.accounts.create(accountToApi({
          name: importAccount.name,
          bank: importAccount.bank,
          type: importAccount.type,
          initialBalance: importAccount.initialBalance,
          memberIds: importAccount.memberIds,
        }));
        accountId = created.id;
      }
      // Save bank mapping locally for next imports
      if (importAccount.bank) {
        const newMappings = { ...columnMappings, [importAccount.bank]: currentMapping };
        setColumnMappings(newMappings);
        await persist(STORAGE_KEYS.MAPPINGS, newMappings);
      }
      // Bulk import transactions via API (server handles dedup)
      const txsForApi = importPreview.map(tx => ({
        ...txToApi(tx),
        account_id: accountId, // override to ensure correct account
      }));
      const result = await api.transactions.bulkImport(accountId, txsForApi);
      showToast(`✅ ${result.inserted} transactions ajoutées${result.skipped_duplicates > 0 ? ` · ${result.skipped_duplicates} doublons ignorés` : ''}`, 'success');
      if (transactions.length === 0 && result.inserted > 0) unlockAchievement('first_import');
      // Reload from server to get fresh state
      await reloadAll();
      setImportFile(null); setImportStep('upload'); setParsedData(null);
      setCurrentMapping({}); setImportPreview([]); setImportAccount({ name: '', bank: '', memberIds: [], type: 'checking', initialBalance: 0 });
      setView('dashboard');
    } catch (err) {
      showToast('Erreur d\'import : ' + err.message, 'error');
    }
  };

  const cancelImport = () => {
    setImportFile(null); setImportStep('upload'); setParsedData(null);
    setCurrentMapping({}); setImportPreview([]); setDetectedBank(null);
  };

  const updateTransactionCategory = async (txId, categoryId) => {
    try {
      await api.transactions.update(txId, { category_slug: categoryId, is_manual_category: true });
      setTransactions(prev => prev.map(t => t.id === txId ? { ...t, categoryId, isManualCategory: true } : t));
      // Learn rule for similar future transactions
      const tx = transactions.find(t => t.id === txId);
      if (tx && tx.label) {
        const keyword = tx.label.split(/\s+/).filter(w => w.length > 4).slice(0, 1)[0];
        if (keyword) {
          const pattern = keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
          const exists = customRules.some(r => r.pattern === pattern && r.categoryId === categoryId);
          if (!exists) {
            try {
              const newRule = await api.rules.create({ pattern, category_slug: categoryId, source: 'learned' });
              setCustomRules(prev => [...prev, { pattern, categoryId, source: 'learned', _id: newRule.id }]);
            } catch {}
          }
        }
      }
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const toggleRecurring = async (txId, isFixed) => {
    // Stored locally as UI override (the backend has its own column but we keep this client-side for speed)
    const newOverrides = { ...recurringOverrides, [txId]: isFixed };
    setRecurringOverrides(newOverrides);
    await persist(STORAGE_KEYS.RECURRING_OVERRIDES, newOverrides);
    // Also persist to backend
    try { await api.transactions.update(txId, { is_recurring_override: isFixed }); } catch {}
  };

  const deleteTransaction = async (txId) => {
    if (!confirm('Supprimer cette transaction ?')) return;
    try {
      await api.transactions.delete(txId);
      setTransactions(prev => prev.filter(t => t.id !== txId));
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const deleteAccount = async (accId) => {
    if (!confirm('Supprimer ce compte et toutes ses transactions ?')) return;
    try {
      await api.accounts.delete(accId);
      setAccounts(prev => prev.filter(a => a.id !== accId));
      setTransactions(prev => prev.filter(t => t.accountId !== accId));
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const saveAsset = async (asset) => {
    try {
      const apiPayload = assetToApi(asset);
      let saved;
      if (asset.id) saved = await api.assets.update(asset.id, apiPayload);
      else saved = await api.assets.create(apiPayload);
      const mapped = assetFromApi(saved);
      setAssets(prev => asset.id ? prev.map(a => a.id === asset.id ? mapped : a) : [...prev, mapped]);
      if (assets.length === 0) unlockAchievement('first_asset');
      showToast('💎 Actif enregistré', 'success');
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const deleteAsset = async (assetId) => {
    if (!confirm('Supprimer cet actif ?')) return;
    try {
      await api.assets.delete(assetId);
      setAssets(prev => prev.filter(a => a.id !== assetId));
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const saveLiability = async (lia) => {
    try {
      const apiPayload = liaToApi(lia);
      let saved;
      if (lia.id) saved = await api.liabilities.update(lia.id, apiPayload);
      else saved = await api.liabilities.create(apiPayload);
      const mapped = liaFromApi(saved);
      setLiabilities(prev => lia.id ? prev.map(l => l.id === lia.id ? mapped : l) : [...prev, mapped]);
      showToast('💳 Prêt enregistré', 'success');
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const deleteLiability = async (liaId) => {
    if (!confirm('Supprimer ce prêt ?')) return;
    try {
      await api.liabilities.delete(liaId);
      setLiabilities(prev => prev.filter(l => l.id !== liaId));
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const saveMember = async (member) => {
    try {
      const payload = { name: member.name, role: member.role, color: member.color };
      let saved;
      if (member.id) saved = await api.members.update(member.id, payload);
      else saved = await api.members.create(payload);
      setMembers(prev => member.id ? prev.map(m => m.id === member.id ? saved : m) : [...prev, saved]);
      if ((members.length + (member.id ? 0 : 1)) > 1) unlockAchievement('first_member');
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const deleteMember = async (memberId) => {
    if (!confirm('Supprimer ce membre ? Les comptes/actifs liés ne seront pas supprimés.')) return;
    try {
      await api.members.delete(memberId);
      setMembers(prev => prev.filter(m => m.id !== memberId));
      if (activeMemberId === memberId) setActiveMemberId('all');
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const setBudget = async (categoryId, amount) => {
    const num = parseFloat(amount) || 0;
    try {
      await api.budgets.set(categoryId, num);
      setBudgets(prev => ({ ...prev, [categoryId]: num }));
      if (Object.values(budgets).filter(b => b > 0).length === 0 && num > 0) unlockAchievement('first_budget');
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const saveGoal = async (goal) => {
    try {
      const apiPayload = goalToApi(goal);
      let saved;
      if (goal.id) saved = await api.goals.update(goal.id, apiPayload);
      else saved = await api.goals.create(apiPayload);
      const mapped = goalFromApi(saved);
      setGoals(prev => goal.id ? prev.map(g => g.id === goal.id ? mapped : g) : [...prev, mapped]);
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const deleteGoal = async (id) => {
    if (!confirm('Supprimer cet objectif ?')) return;
    try {
      await api.goals.delete(id);
      setGoals(prev => prev.filter(g => g.id !== id));
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const exportData = () => {
    // Export current frontend state as JSON (matches v2 backup format)
    const data = {
      version: 2, app: 'Wealthly', exportedAt: new Date().toISOString(),
      members, accounts, transactions, assets, liabilities, categories, customRules, budgets, columnMappings, recurringOverrides, goals, achievements,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `wealthly-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    showToast('📥 Backup téléchargé', 'success');
  };

  const importData = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!confirm('Importer ce backup ajoutera ses données à votre foyer actuel (les doublons sont ignorés). Continuer ?')) return;
    try {
      const text = await file.text();
      const data = JSON.parse(text);
      const result = await api.migrate.importJson(data);
      const stats = result.imported || {};
      showToast(`✅ Import : ${stats.transactions || 0} tx, ${stats.members || 0} membres, ${stats.assets || 0} actifs`, 'success');
      await reloadAll();
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error');
    }
  };

  const resetAllData = async () => {
    if (!confirm('Effacer TOUTES les données du foyer ? Cette action est irréversible.')) return;
    if (!confirm('Vraiment sûr ? Faites un export avant !')) return;
    try {
      // Delete in safe order
      for (const t of transactions) { try { await api.transactions.delete(t.id); } catch {} }
      for (const a of accounts) { try { await api.accounts.delete(a.id); } catch {} }
      for (const a of assets) { try { await api.assets.delete(a.id); } catch {} }
      for (const l of liabilities) { try { await api.liabilities.delete(l.id); } catch {} }
      for (const g of goals) { try { await api.goals.delete(g.id); } catch {} }
      for (const m of members) { try { await api.members.delete(m.id); } catch {} }
      for (const k of Object.values(STORAGE_KEYS)) await storage.delete(k);
      await reloadAll();
      setOnboarded(false);
      showToast('Données effacées', 'success');
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const logout = () => {
    if (!confirm('Se déconnecter ?')) return;
    api.clearToken();
    window.location.reload();
  };

  // ============================================================================
  // RENDER
  // ============================================================================
  const fmt = (v, opts) => hideAmounts ? '••••' : formatCurrency(v, opts);

  if (loading) return <div className="loading-screen"><Styles theme={theme}/><div className="spinner"/><span>Chargement…</span></div>;

  if (!onboarded) {
    return (
      <>
        <Styles theme={theme}/>
        <Onboarding onComplete={completeOnboarding}/>
      </>
    );
  }

  const activeMember = members.find(m => m.id === activeMemberId);

  return (
    <div className={`app theme-${theme}`}>
      <Styles theme={theme}/>
      {confettiActive && <Confetti/>}
      {toast && <Toast message={toast.message} type={toast.type}/>}

      {demoMode && (
        <div className="demo-banner">
          <span className="demo-banner-pill">DÉMO</span>
          <span className="demo-banner-text">
            Données fictives — pour découvrir l'app sans inscription. Les modifications ne sont pas enregistrées.
          </span>
          <button className="demo-banner-action" onClick={onExitDemo}>
            Quitter la démo
          </button>
        </div>
      )}

      <header className="app-header">
        <div className="brand" onClick={() => setView('dashboard')}>
          <div className="brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width="22" height="22">
              <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
              <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
            </svg>
          </div>
          <div className="brand-text">
            <div className="brand-name">{APP_NAME}</div>
            <div className="brand-tagline">Patrimoine privé</div>
          </div>
        </div>
        <nav className="main-nav">
          <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}><Activity size={14}/> <span>Résumé</span></button>
          <button onClick={() => setView('monthly')} className={view === 'monthly' ? 'active' : ''}><Calendar size={14}/> <span>Suivi mensuel</span></button>
          <button onClick={() => setView('budgets')} className={view === 'budgets' ? 'active' : ''}>
            <Target size={14}/> <span>Budgets</span>
            {budgetsOverCount > 0 && (
              <span className="nav-alert-dot" title={`${budgetsOverCount} budget${budgetsOverCount > 1 ? 's' : ''} dépassé${budgetsOverCount > 1 ? 's' : ''}`}>{budgetsOverCount}</span>
            )}
          </button>
          <button onClick={() => setView('wealth')} className={view === 'wealth' ? 'active' : ''}><Landmark size={14}/> <span>Patrimoine</span></button>
          <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'active' : ''}><BarChart3 size={14}/> <span>Transactions</span></button>
          <button onClick={() => setView('tax')} className={view === 'tax' ? 'active' : ''}><Calculator size={14}/> <span>Impôts</span></button>
          <button onClick={() => setView('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={14}/> <span>Réglages</span></button>
        </nav>
        <div className="header-actions">
          <button className="icon-btn" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} title="Changer thème">
            {theme === 'light' ? <Moon size={16}/> : <Sun size={16}/>}
          </button>
          <button className="icon-btn" onClick={() => setHideAmounts(!hideAmounts)} title="Masquer/afficher">
            {hideAmounts ? <EyeOff size={16}/> : <Eye size={16}/>}
          </button>
          <button className="icon-btn" onClick={logout} title="Déconnexion">
            <LogOut size={16}/>
          </button>
          <button className="primary-btn" onClick={() => { setView('import'); setImportStep('upload'); }}>
            <Upload size={14}/> <span>Importer</span>
          </button>
        </div>
      </header>

      <div className="member-bar">
        <div className="member-tabs">
          <button className={`member-tab ${activeMemberId === 'all' ? 'active' : ''}`} onClick={() => setActiveMemberId('all')}>
            <Users size={13}/> <span>Famille</span>
          </button>
          {members.map(m => (
            <button key={m.id} className={`member-tab ${activeMemberId === m.id ? 'active' : ''}`} onClick={() => setActiveMemberId(m.id)} style={activeMemberId === m.id ? { background: m.color, color: '#fff', borderColor: m.color } : {}}>
              <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
              <span>{m.name}</span>
              {m.role === 'child' && <span className="role-badge">enfant</span>}
            </button>
          ))}
        </div>
        {activeMember && (
          <div className="member-context">
            Vue de <strong>{activeMember.name}</strong> · comptes perso + comptes joints
          </div>
        )}
      </div>

      <main className="content">
        {view === 'dashboard' && (
          <Dashboard
            netWorth={netWorth} liquidWealth={liquidWealth} assetsValue={assetsValue} liabilitiesValue={liabilitiesValue}
            thisMonthStats={thisMonthStats} monthlyEvolution={monthlyEvolution}
            visibleAccounts={visibleAccounts} accountBalances={accountBalances}
            visibleAssets={visibleAssets} visibleLiabilities={visibleLiabilities}
            members={members} activeMemberId={activeMemberId}
            transactions={visibleTransactions} categories={categories} fmt={fmt}
            memberShare={memberShare} categoryAnalysis={categoryAnalysis}
            anomalies={anomalies} cashflowProjection={cashflowProjection}
            achievements={achievements} goals={goals}
            recurringGroups={recurringGroups} currentMonth={currentMonth}
            setView={setView}
          />
        )}
        {view === 'monthly' && (
          <Monthly
            transactions={visibleTransactions} accounts={accounts} categories={categories}
            recurringIds={recurringIds} recurringGroups={recurringGroups}
            monthlyEvolution={monthlyEvolution} thisMonthStats={thisMonthStats}
            cashflowProjection={cashflowProjection} anomalies={anomalies}
            categoryAnalysis={categoryAnalysis}
            toggleRecurring={toggleRecurring} memberShare={memberShare}
            currentMonth={currentMonth} fmt={fmt}
          />
        )}
        {view === 'analysis' && (
          <Monthly
            transactions={visibleTransactions} accounts={accounts} categories={categories}
            recurringIds={recurringIds} recurringGroups={recurringGroups}
            monthlyEvolution={monthlyEvolution} thisMonthStats={thisMonthStats}
            cashflowProjection={cashflowProjection} anomalies={anomalies}
            categoryAnalysis={categoryAnalysis}
            toggleRecurring={toggleRecurring} memberShare={memberShare}
            currentMonth={currentMonth} fmt={fmt}
          />
        )}
        {view === 'budgets' && (
          <Budgets
            categories={categories} budgets={budgets} setBudget={setBudget}
            categoryAnalysis={categoryAnalysis} fiftyThirtyTwenty={fiftyThirtyTwenty}
            thisMonthStats={thisMonthStats} cashflowProjection={cashflowProjection}
            goals={goals} saveGoal={saveGoal} deleteGoal={deleteGoal}
            fmt={fmt}
          />
        )}
        {view === 'wealth' && (
          <Wealth
            assets={assets} liabilities={liabilities} members={members} activeMemberId={activeMemberId}
            visibleAssets={visibleAssets} visibleLiabilities={visibleLiabilities}
            saveAsset={saveAsset} deleteAsset={deleteAsset}
            saveLiability={saveLiability} deleteLiability={deleteLiability}
            memberShare={memberShare} fmt={fmt}
            wealthHistory={wealthHistory}
          />
        )}
        {view === 'transactions' && (
          <Transactions
            transactions={visibleTransactions} accounts={accounts} categories={categories}
            recurringIds={recurringIds} toggleRecurring={toggleRecurring}
            updateCategory={updateTransactionCategory} deleteTransaction={deleteTransaction} fmt={fmt}
          />
        )}
        {view === 'analysis' && (
          <Analysis
            transactions={visibleTransactions} categories={categories}
            recurringIds={recurringIds} recurringGroups={recurringGroups} monthlyEvolution={monthlyEvolution}
            accounts={accounts} memberShare={memberShare} fmt={fmt}
          />
        )}
        {view === 'tax' && (
          <TaxSimulator transactions={visibleTransactions} />
        )}
        {view === 'settings' && (
          <SettingsView
            members={members} accounts={accounts} accountBalances={accountBalances}
            saveMember={saveMember} deleteMember={deleteMember}
            deleteAccount={deleteAccount} achievements={achievements}
            exportData={exportData} importData={importData} resetAllData={resetAllData}
            categories={categories}
            fmt={fmt}
          />
        )}
        {view === 'import' && (
          <ImportFlow
            step={importStep} parsedData={parsedData} mapping={currentMapping} setMapping={setCurrentMapping}
            account={importAccount} setAccount={setImportAccount} preview={importPreview}
            categories={categories} members={members} existingAccounts={accounts}
            knownMappings={columnMappings} detectedBank={detectedBank}
            handleFileUpload={handleFileUpload} proceedToAccountStep={proceedToAccountStep}
            proceedToPreview={proceedToPreview} confirmImport={confirmImport} cancelImport={cancelImport}
            setStep={setImportStep} fmt={fmt}
          />
        )}
      </main>
    </div>
  );
}
// ============================================================================
// HELPER COMPONENTS
// ============================================================================

function Toast({ message, type }) {
  return (
    <div className={`toast toast-${type}`}>
      <div className="toast-content">{message}</div>
    </div>
  );
}

function Confetti() {
  const pieces = useMemo(() => Array.from({ length: 60 }, (_, i) => ({
    id: i,
    left: Math.random() * 100,
    delay: Math.random() * 0.4,
    duration: 2 + Math.random() * 1.5,
    color: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6'][Math.floor(Math.random() * 5)],
    size: 6 + Math.random() * 8,
    rotation: Math.random() * 360,
  })), []);
  return (
    <div className="confetti-container">
      {pieces.map(p => (
        <div key={p.id} className="confetti-piece" style={{
          left: `${p.left}%`, animationDelay: `${p.delay}s`, animationDuration: `${p.duration}s`,
          background: p.color, width: `${p.size}px`, height: `${p.size}px`,
          transform: `rotate(${p.rotation}deg)`,
        }}/>
      ))}
    </div>
  );
}

function AnimatedNumber({ value, format, duration = 800 }) {
  const [display, setDisplay] = useState(value);
  const startRef = useRef(null);
  const startValueRef = useRef(value);
  const targetRef = useRef(value);

  useEffect(() => {
    if (Math.abs(targetRef.current - value) < 0.01) return;
    startValueRef.current = display;
    targetRef.current = value;
    startRef.current = null;
    let raf;
    const step = (ts) => {
      if (!startRef.current) startRef.current = ts;
      const elapsed = ts - startRef.current;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = startValueRef.current + (targetRef.current - startValueRef.current) * eased;
      setDisplay(current);
      if (progress < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [value, duration]);

  return <>{format ? format(display) : display}</>;
}

// ============================================================================
// ONBOARDING
// ============================================================================
// Member palette — harmonised with the private-banking tokens.
// Stable order so the same person keeps the same colour across renders.
const MEMBER_PALETTE = ['#c5a572', '#88a978', '#7a8aa8', '#c8855a', '#9d8bb5', '#d4a554', '#c47158', '#8c918f'];

function Onboarding({ onComplete }) {
  const [step, setStep] = useState(0);
  const [members, setMembers] = useState([]);
  const [memberDraft, setMemberDraft] = useState({ name: '', role: 'adult', color: MEMBER_PALETTE[0] });

  const addMember = () => {
    if (!memberDraft.name.trim()) return;
    setMembers([...members, { ...memberDraft, id: generateId(), color: MEMBER_PALETTE[members.length % MEMBER_PALETTE.length] }]);
    setMemberDraft({ name: '', role: 'adult', color: MEMBER_PALETTE[0] });
  };
  const removeMember = (id) => setMembers(members.filter(m => m.id !== id));

  const finish = () => {
    if (members.length === 0) {
      onComplete({ members: [{ id: generateId(), name: 'Moi', role: 'adult', color: MEMBER_PALETTE[0] }] });
    } else {
      onComplete({ members });
    }
  };

  return (
    <div className="onboarding">
      <div className="onboarding-bg-mesh"/>
      <div className="onboarding-card">
        <div className="onboarding-progress">
          <div className={`progress-step ${step >= 0 ? 'active' : ''} ${step > 0 ? 'done' : ''}`}>
            <div className="progress-dot">{step > 0 ? <Check size={10}/> : '1'}</div>
            <span>Bienvenue</span>
          </div>
          <div className="progress-line"/>
          <div className={`progress-step ${step >= 1 ? 'active' : ''} ${step > 1 ? 'done' : ''}`}>
            <div className="progress-dot">{step > 1 ? <Check size={10}/> : '2'}</div>
            <span>Famille</span>
          </div>
          <div className="progress-line"/>
          <div className={`progress-step ${step >= 2 ? 'active' : ''}`}>
            <div className="progress-dot">3</div>
            <span>C'est parti</span>
          </div>
        </div>

        {step === 0 && (
          <div className="onboarding-step-content">
            <div className="onboarding-hero">
              <div className="ob-mark-large">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width="40" height="40">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
                  <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
                </svg>
              </div>
              <h1>Bienvenue chez Wealthly</h1>
              <p className="onboarding-lead">Vue consolidée de votre patrimoine familial — comptes, placements, immobilier, prêts. Souverain, chiffré, vôtre.</p>
            </div>
            <div className="onboarding-features-grid">
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--primary-soft)', color: 'var(--primary)' }}><Users size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Famille intelligente</strong>
                  <span>Espaces privés par adulte, comptes joints partagés automatiquement</span>
                </div>
              </div>
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--success-soft)', color: 'var(--success)' }}><Sparkles size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Catégorisation automatique</strong>
                  <span>Détection des marchands français, apprentissage de vos corrections</span>
                </div>
              </div>
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}><Activity size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Suivi mensuel intelligent</strong>
                  <span>Charges fixes auto-détectées, anomalies signalées, projections</span>
                </div>
              </div>
              <div className="ob-feature-card">
                <div className="ob-feature-icon" style={{ background: 'var(--purple-soft)', color: 'var(--purple)' }}><Landmark size={18}/></div>
                <div className="ob-feature-text">
                  <strong>Patrimoine complet</strong>
                  <span>Immobilier, AV, PEA, crypto, prêts — pas que du bancaire</span>
                </div>
              </div>
            </div>
            <button className="primary-btn-large" onClick={() => setStep(1)}>
              <Play size={16}/> Commencer
            </button>
          </div>
        )}

        {step === 1 && (
          <div className="onboarding-step-content">
            <h2>Qui compose votre foyer ?</h2>
            <p className="onboarding-lead">Ajoutez chaque personne. Les adultes auront leur propre espace privé, les enfants seront associés à un parent (utile pour leur PEA jeune par exemple).</p>

            {members.length > 0 && (
              <div className="member-preview-list">
                {members.map(m => (
                  <div key={m.id} className="member-preview" style={{ '--member-color': m.color }}>
                    <span className="member-avatar large" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                    <div className="member-preview-info">
                      <span className="member-preview-name">{m.name}</span>
                      <span className="member-preview-role">{m.role === 'adult' ? 'Adulte' : 'Enfant'}</span>
                    </div>
                    <button className="icon-btn-sm" onClick={() => removeMember(m.id)}><X size={14}/></button>
                  </div>
                ))}
              </div>
            )}

            <div className="add-member-form">
              <input placeholder="Prénom" value={memberDraft.name} onChange={(e) => setMemberDraft({ ...memberDraft, name: e.target.value })} onKeyDown={(e) => e.key === 'Enter' && addMember()} autoFocus/>
              <select value={memberDraft.role} onChange={(e) => setMemberDraft({ ...memberDraft, role: e.target.value })}>
                <option value="adult">Adulte</option>
                <option value="child">Enfant</option>
              </select>
              <button className="primary-btn" onClick={addMember}><Plus size={14}/></button>
            </div>

            <div className="ob-tip">
              <Lightbulb size={16}/>
              <span><strong>Conseil :</strong> commencez par vous, puis votre conjoint·e si applicable, puis les enfants. Vous pourrez modifier plus tard.</span>
            </div>

            <div className="onboarding-actions">
              <button className="secondary-btn" onClick={() => setStep(0)}><ChevronLeft size={14}/> Retour</button>
              <button className="primary-btn" onClick={() => setStep(2)} disabled={members.length === 0}>Suivant <ChevronRight size={14}/></button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-step-content">
            <div className="ready-icon"><Check size={28} strokeWidth={2}/></div>
            <h2>Configuration terminée</h2>
            <p className="onboarding-lead">Votre espace est prêt. Ajoutez vos comptes, votre patrimoine et vos prêts au fil du temps — commencez petit, enrichissez au rythme qui vous convient.</p>

            <div className="onboarding-summary">
              <div className="summary-stat">
                <div className="summary-num">{members.length || 1}</div>
                <div className="summary-label">membre{(members.length || 1) > 1 ? 's' : ''} configuré{(members.length || 1) > 1 ? 's' : ''}</div>
              </div>
              <div className="summary-list">
                {(members.length > 0 ? members : [{ name: 'Moi', role: 'adult', color: '#3b82f6' }]).map((m, i) => (
                  <div key={i} className="summary-member">
                    <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                    <span>{m.name}</span> <span className="dimmed">· {m.role === 'adult' ? 'adulte' : 'enfant'}</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="ob-next-steps">
              <strong>Vos prochaines étapes :</strong>
              <div className="next-step-item">
                <div className="step-num">1</div>
                <div>Importez votre premier CSV bancaire (Revolut, Crédit Agricole, Boursorama…)</div>
              </div>
              <div className="next-step-item">
                <div className="step-num">2</div>
                <div>Renseignez votre patrimoine non-bancaire (PEA, AV, immo)</div>
              </div>
              <div className="next-step-item">
                <div className="step-num">3</div>
                <div>Définissez vos premiers budgets</div>
              </div>
            </div>

            <div className="onboarding-actions">
              <button className="secondary-btn" onClick={() => setStep(1)}><ChevronLeft size={14}/> Retour</button>
              <button className="primary-btn-large" onClick={finish}>
                <Sparkles size={16}/> Entrer dans Wealthly
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// DASHBOARD
// ============================================================================
function Dashboard({ netWorth, liquidWealth, assetsValue, liabilitiesValue, thisMonthStats, monthlyEvolution, visibleAccounts, accountBalances, visibleAssets, visibleLiabilities, members, activeMemberId, transactions, categories, fmt, memberShare, categoryAnalysis, anomalies, cashflowProjection, achievements, goals, recurringGroups, currentMonth, setView }) {
  const last12Months = monthlyEvolution.slice(-12);
  const recentTx = [...transactions].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 5);
  const activeMember = members.find(m => m.id === activeMemberId);

  // Allocation donut: liquidités + actifs par classe
  const allocationData = useMemo(() => {
    const classes = {};
    if (liquidWealth > 0) classes['Liquidités'] = { value: liquidWealth, color: 'var(--color-w-asset-cash)' };
    visibleAssets.forEach(a => {
      const cls = ASSET_CLASS_MAP[a.type]?.class || 'Divers';
      const color = ASSET_CLASS_MAP[a.type]?.color || '#8a8a93';
      const val = (parseFloat(a.currentValue) || 0) * memberShare(a);
      if (!classes[cls]) classes[cls] = { value: 0, color };
      classes[cls].value += val;
    });
    return Object.entries(classes).filter(([, d]) => d.value > 0).map(([name, d]) => ({ name, ...d }));
  }, [liquidWealth, visibleAssets, memberShare]);

  const allocationTotal = allocationData.reduce((s, d) => s + d.value, 0);

  // Performance: % change vs 1 month ago and 3 months ago
  const perf = useMemo(() => {
    const sorted = [...monthlyEvolution].sort((a, b) => a.month.localeCompare(b.month));
    if (sorted.length < 2) return { m1: null, m3: null };
    const last = sorted[sorted.length - 1].balance;
    const prev1 = sorted[sorted.length - 2].balance;
    const prev3 = sorted.length >= 4 ? sorted[sorted.length - 4].balance : null;
    return {
      m1: prev1 !== 0 ? ((last - prev1) / Math.abs(prev1)) * 100 : null,
      m3: prev3 && prev3 !== 0 ? ((last - prev3) / Math.abs(prev3)) * 100 : null,
    };
  }, [monthlyEvolution]);

  const liquidityRatio = netWorth > 0 ? (liquidWealth / netWorth) * 100 : null;
  const debtRatio = (assetsValue + liquidWealth) > 0 ? (liabilitiesValue / (assetsValue + liquidWealth)) * 100 : null;

  const streak = useMemo(() => {
    let count = 0;
    for (let i = monthlyEvolution.length - 1; i >= 0; i--) {
      if (monthlyEvolution[i].net > 0) count++;
      else break;
    }
    return count;
  }, [monthlyEvolution]);

  const topCategoriesThisMonth = useMemo(() => {
    return Object.entries(categoryAnalysis)
      .filter(([catId, data]) => data.current > 0)
      .map(([catId, data]) => {
        const cat = categories.find(c => c.id === catId);
        const change = data.avg3m > 0 ? ((data.current - data.avg3m) / data.avg3m) * 100 : 0;
        return { id: catId, name: cat?.name, icon: cat?.icon, color: cat?.color, current: data.current, avg: data.avg3m, change };
      })
      .sort((a, b) => b.current - a.current)
      .slice(0, 5);
  }, [categoryAnalysis, categories]);

  if (visibleAccounts.length === 0 && visibleAssets.length === 0 && visibleLiabilities.length === 0) {
    return (
      <div className="w-redesign min-h-[60vh] flex flex-col items-center justify-center text-center px-6">
        <div className="w-14 h-14 rounded-full bg-[var(--color-w-accent-soft)] flex items-center justify-center mb-5 text-[var(--color-w-accent)]">
          <Sparkles size={24}/>
        </div>
        <h1 className="text-2xl font-semibold tracking-tight text-[var(--color-w-text)] mb-2">{activeMember ? `Bonjour ${activeMember.name}` : 'Bienvenue'}</h1>
        <p className="text-[var(--color-w-muted)] max-w-md mb-6">Aucune donnée pour l'instant. Importez votre premier CSV ou ajoutez un actif pour commencer.</p>
        <div className="flex gap-3">
          <button onClick={() => setView('import')} className="inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-w-md)] bg-[var(--color-w-accent)] text-[#0a0a0c] font-medium hover:bg-[var(--color-w-accent-hover)] transition-colors">
            <Upload size={15}/> Importer un CSV
          </button>
          <button onClick={() => setView('wealth')} className="inline-flex items-center gap-2 px-4 h-10 rounded-[var(--radius-w-md)] border border-[var(--color-w-border-strong)] text-[var(--color-w-text)] hover:bg-[var(--color-w-surface-2)] transition-colors">
            <Plus size={14}/> Ajouter un actif
          </button>
        </div>
      </div>
    );
  }

  const greeting = (() => {
    const h = new Date().getHours();
    if (h < 5) return 'Bonsoir';
    if (h < 12) return 'Bonjour';
    if (h < 18) return 'Bon après-midi';
    return 'Bonsoir';
  })();

  const dateLong = new Date().toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  const m1Positive = perf.m1 === null ? null : perf.m1 >= 0;

  // Card primitives — Tailwind classes referencing the design tokens.
  const cardCls = 'bg-[var(--color-w-surface)] border border-[var(--color-w-border)] rounded-[var(--radius-w-lg)]';
  const labelCls = 'text-[11px] uppercase tracking-[0.08em] text-[var(--color-w-muted)] font-medium';

  return (
    <div className="w-redesign font-sans">
      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-7">
        <div>
          <p className={labelCls + ' mb-2'}>{greeting}{activeMember ? ` · ${activeMember.name}` : ''}</p>
          <h1 className="text-[28px] leading-tight font-semibold tracking-tight text-[var(--color-w-text)]">Patrimoine</h1>
          <p className="text-sm text-[var(--color-w-faint)] mt-1">{dateLong}</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {streak >= 2 && (
            <div className="inline-flex items-center gap-2 px-3 h-8 rounded-full border border-[var(--color-w-border)] bg-[var(--color-w-surface)] text-xs text-[var(--color-w-text)]">
              <Zap size={13} className="text-[var(--color-w-accent)]"/>
              <span className="text-[var(--color-w-muted)]">{streak} mois positifs d'affilée</span>
            </div>
          )}
          <button
            onClick={() => generateBilanPdf({
              netWorth, liquidWealth, assetsValue, liabilitiesValue,
              thisMonthStats, monthlyEvolution,
              visibleAccounts, accountBalances, visibleAssets, visibleLiabilities,
              members, activeMemberId,
              recurringGroups, categoryAnalysis, categories,
              memberShare, currentMonth,
              ASSET_CLASS_MAP,
            })}
            className="inline-flex items-center gap-2 px-3 h-8 rounded-md border border-[var(--color-w-border-strong)] bg-[var(--color-w-surface)] text-xs text-[var(--color-w-text)] hover:bg-[var(--color-w-surface-2)] transition-colors"
            title="Télécharger le bilan en PDF"
          >
            <FileText size={13} className="text-[var(--color-w-accent)]"/>
            <span>Exporter PDF</span>
          </button>
        </div>
      </div>

      {/* Hero KPIs — 4 cards, primary spans 2 cols */}
      <section className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
        {/* Card 1 — Patrimoine net (primary, 2 cols) */}
        <div className={`${cardCls} lg:col-span-2 p-6 relative overflow-hidden`}>
          <div className={labelCls}>Patrimoine net</div>
          <div className="text-[40px] leading-[1.1] font-semibold tracking-tight w-num text-[var(--color-w-text)] mt-3">
            <AnimatedNumber value={netWorth} format={(v) => fmt(v)}/>
          </div>
          <div className="flex flex-wrap gap-x-6 gap-y-2 mt-5 text-[13px] text-[var(--color-w-muted)]">
            {liquidWealth > 0 && (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-w-asset-cash)]"/>
                <span className="w-num text-[var(--color-w-text)]">{fmt(liquidWealth)}</span>
                <span>liquidités</span>
              </span>
            )}
            {assetsValue > 0 && (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-w-asset-equity)]"/>
                <span className="w-num text-[var(--color-w-text)]">{fmt(assetsValue)}</span>
                <span>actifs</span>
              </span>
            )}
            {liabilitiesValue > 0 && (
              <span className="inline-flex items-center gap-2">
                <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-w-danger)]"/>
                <span className="w-num text-[var(--color-w-text)]">−{fmt(liabilitiesValue)}</span>
                <span>dettes</span>
              </span>
            )}
          </div>
        </div>

        {/* Card 2 — Performance 1 mois */}
        <div className={`${cardCls} p-6`}>
          <div className="flex items-start justify-between">
            <div className={labelCls}>Performance 1 mois</div>
            <div className={m1Positive === null ? 'text-[var(--color-w-faint)]' : m1Positive ? 'text-[var(--color-w-accent)]' : 'text-[var(--color-w-danger)]'}>
              {m1Positive === null ? <Activity size={16}/> : m1Positive ? <TrendingUp size={16}/> : <TrendingDown size={16}/>}
            </div>
          </div>
          <div className={`text-[28px] leading-tight font-semibold w-num mt-3 ${m1Positive === null ? 'text-[var(--color-w-text)]' : m1Positive ? 'text-[var(--color-w-accent)]' : 'text-[var(--color-w-danger)]'}`}>
            {perf.m1 !== null ? `${perf.m1 >= 0 ? '+' : ''}${perf.m1.toFixed(2)}%` : '—'}
          </div>
          {perf.m3 !== null && (
            <div className="text-xs text-[var(--color-w-muted)] mt-3">3 mois&nbsp;: <span className="w-num text-[var(--color-w-text)]">{perf.m3 >= 0 ? '+' : ''}{perf.m3.toFixed(1)}%</span></div>
          )}
        </div>

        {/* Card 3 — Liquidité OU Épargne du mois (selon présence dettes) */}
        {liabilitiesValue > 0 ? (
          <div className={`${cardCls} p-6`}>
            <div className="flex items-start justify-between">
              <div className={labelCls}>Ratio dette / actifs</div>
              <CreditCard size={16} className="text-[var(--color-w-faint)]"/>
            </div>
            <div className="text-[28px] leading-tight font-semibold w-num mt-3 text-[var(--color-w-text)]">
              {debtRatio !== null ? `${debtRatio.toFixed(1)}%` : '—'}
            </div>
            <div className="text-xs mt-3">
              {debtRatio === null ? null : debtRatio < 30 ? (
                <span className="text-[var(--color-w-accent)]">Sain</span>
              ) : debtRatio < 50 ? (
                <span className="text-[var(--color-w-warning)]">Surveillé</span>
              ) : (
                <span className="text-[var(--color-w-danger)]">Élevé</span>
              )}
            </div>
          </div>
        ) : (
          <div className={`${cardCls} p-6`}>
            <div className="flex items-start justify-between">
              <div className={labelCls}>Épargne du mois</div>
              <PiggyBank size={16} className="text-[var(--color-w-accent)]"/>
            </div>
            <div className={`text-[28px] leading-tight font-semibold w-num mt-3 ${thisMonthStats.net >= 0 ? 'text-[var(--color-w-accent)]' : 'text-[var(--color-w-danger)]'}`}>
              <AnimatedNumber value={thisMonthStats.net} format={(v) => fmt(v, { sign: true })}/>
            </div>
            {thisMonthStats.income > 0 && (
              <div className="text-xs text-[var(--color-w-muted)] mt-3">Taux&nbsp;: <span className="w-num text-[var(--color-w-text)]">{((thisMonthStats.net / thisMonthStats.income) * 100).toFixed(0)}%</span> des revenus</div>
            )}
          </div>
        )}
      </section>

      {/* Anomalies — alert strip */}
      {anomalies.length > 0 && (
        <section className={`${cardCls} p-5 mb-5 border-l-2 border-l-[var(--color-w-warning)]`}>
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle size={15} className="text-[var(--color-w-warning)]"/>
            <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Anomalies détectées</h3>
            <span className="text-xs text-[var(--color-w-faint)] ml-auto">vs moyenne 3 derniers mois</span>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {anomalies.slice(0, 3).map(a => (
              <div key={a.categoryId} className="flex items-center gap-3 p-3 rounded-[var(--radius-w-md)] bg-[var(--color-w-surface-2)]">
                <span className="w-8 h-8 flex items-center justify-center rounded-[var(--radius-w-sm)] text-base" style={{ background: (a.color || '#999') + '22', color: a.color }}>{a.icon}</span>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium text-[var(--color-w-text)] truncate">{a.name}</div>
                  <div className="text-xs text-[var(--color-w-muted)] w-num">
                    {fmt(a.current)} vs {fmt(a.avg)} <span className="text-[var(--color-w-danger)] font-semibold">×{a.ratio.toFixed(1)}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Net worth chart */}
      <section className={`${cardCls} p-6 mb-5`}>
        <div className="flex items-center justify-between mb-5">
          <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Évolution des liquidités</h3>
          <span className="text-xs text-[var(--color-w-faint)]">{last12Months.length} derniers mois</span>
        </div>
        {last12Months.length > 1 ? (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={last12Months} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="balanceGradV2" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--color-w-accent)" stopOpacity={0.28}/>
                  <stop offset="100%" stopColor="var(--color-w-accent)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--color-w-border)" vertical={false}/>
              <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--color-w-faint)" fontSize={11} tickLine={false} axisLine={false}/>
              <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--color-w-faint)" fontSize={11} tickLine={false} axisLine={false} width={55}/>
              <Tooltip
                contentStyle={{ background: 'var(--color-w-surface-2)', border: '1px solid var(--color-w-border-strong)', borderRadius: 10, fontSize: 12, color: 'var(--color-w-text)' }}
                cursor={{ stroke: 'var(--color-w-border-strong)', strokeWidth: 1 }}
                formatter={(v) => formatCurrency(v)}
                labelFormatter={(m) => formatDate(m + '-01', { format: 'long' })}
              />
              <Area type="monotone" dataKey="balance" stroke="var(--color-w-accent)" strokeWidth={2} fill="url(#balanceGradV2)"/>
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-[200px] flex flex-col items-center justify-center gap-3 text-[var(--color-w-faint)]">
            <Activity size={26}/>
            <span className="text-sm">Importez plus de mois pour voir la tendance</span>
          </div>
        )}
      </section>

      {/* Two-col grid: composition + top expenses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {allocationData.length > 0 && (
          <section className={`${cardCls} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Composition</h3>
              <button onClick={() => setView('wealth')} className="text-xs text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] inline-flex items-center gap-1 transition-colors">
                Détails <ChevronRight size={12}/>
              </button>
            </div>
            <div className="flex items-center gap-6">
              <div className="shrink-0 relative">
                <ResponsiveContainer width={170} height={170}>
                  <PieChart>
                    <Pie data={allocationData} dataKey="value" cx="50%" cy="50%" innerRadius={56} outerRadius={80} paddingAngle={2} stroke="none">
                      {allocationData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                    </Pie>
                    <Tooltip contentStyle={{ background: 'var(--color-w-surface-2)', border: '1px solid var(--color-w-border-strong)', borderRadius: 10, fontSize: 12, color: 'var(--color-w-text)' }} formatter={(v) => formatCurrency(v)}/>
                  </PieChart>
                </ResponsiveContainer>
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                  <span className="text-[10px] uppercase tracking-wider text-[var(--color-w-muted)]">Total</span>
                  <span className="text-sm font-semibold w-num text-[var(--color-w-text)]">{fmt(allocationTotal)}</span>
                </div>
              </div>
              <div className="flex-1 min-w-0 space-y-2">
                {allocationData.map(d => {
                  const pct = allocationTotal > 0 ? (d.value / allocationTotal) * 100 : 0;
                  return (
                    <div key={d.name} className="flex items-center gap-3 text-sm">
                      <span className="inline-block w-2 h-2 rounded-full shrink-0" style={{ background: d.color }}/>
                      <span className="text-[var(--color-w-text)] flex-1 truncate">{d.name}</span>
                      <span className="text-xs text-[var(--color-w-muted)] w-num">{pct.toFixed(0)}%</span>
                      <span className="w-num text-[var(--color-w-text)] tabular-nums">{fmt(d.value)}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {topCategoriesThisMonth.length > 0 && (
          <section className={`${cardCls} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Top dépenses du mois</h3>
              <button onClick={() => setView('monthly')} className="text-xs text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] inline-flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight size={12}/>
              </button>
            </div>
            <div className="space-y-3">
              {topCategoriesThisMonth.map(cat => {
                const max = topCategoriesThisMonth[0].current;
                const pct = (cat.current / max) * 100;
                return (
                  <div key={cat.id}>
                    <div className="flex items-center gap-3 mb-1.5">
                      <span className="w-7 h-7 rounded-[var(--radius-w-sm)] flex items-center justify-center text-sm shrink-0" style={{ background: (cat.color || '#999') + '22' }}>{cat.icon}</span>
                      <span className="text-sm text-[var(--color-w-text)] flex-1 truncate">{cat.name}</span>
                      {Math.abs(cat.change) > 5 && (
                        <span className={`text-[10px] font-medium inline-flex items-center gap-0.5 ${cat.change > 0 ? 'text-[var(--color-w-danger)]' : 'text-[var(--color-w-accent)]'}`}>
                          {cat.change > 0 ? <ArrowUp size={9}/> : <ArrowDown size={9}/>}
                          {Math.abs(cat.change).toFixed(0)}%
                        </span>
                      )}
                      <span className="text-sm w-num text-[var(--color-w-text)]">{fmt(cat.current)}</span>
                    </div>
                    <div className="h-1 rounded-full bg-[var(--color-w-surface-3)] overflow-hidden">
                      <div className="h-full rounded-full" style={{ width: `${pct}%`, background: cat.color }}/>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Two-col grid: accounts + recent transactions */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 mb-5">
        {visibleAccounts.length > 0 && (
          <section className={`${cardCls} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Comptes</h3>
              <span className="text-xs text-[var(--color-w-faint)]">{visibleAccounts.length}</span>
            </div>
            <div className="divide-y divide-[var(--color-w-border)]">
              {visibleAccounts.map(a => {
                const ownerNames = (a.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');
                const sharedBalance = (accountBalances[a.id] || 0) * memberShare(a);
                const isJoint = a.memberIds && a.memberIds.length > 1;
                const ownerColor = isJoint ? 'var(--color-w-asset-pension)' : (members.find(m => m.id === a.memberIds?.[0])?.color || 'var(--color-w-muted)');
                return (
                  <div key={a.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 rounded-[var(--radius-w-sm)] flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: ownerColor }}>
                      {isJoint ? <Users size={13}/> : (a.bank?.charAt(0)?.toUpperCase() || '·')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--color-w-text)] truncate">{a.name}</div>
                      <div className="text-xs text-[var(--color-w-muted)] truncate">{a.bank} · {ownerNames}{isJoint ? ' · joint' : ''}</div>
                    </div>
                    <div className={`text-sm w-num ${sharedBalance < 0 ? 'text-[var(--color-w-danger)]' : 'text-[var(--color-w-text)]'}`}>{fmt(sharedBalance)}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {recentTx.length > 0 && (
          <section className={`${cardCls} p-6`}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Activité récente</h3>
              <button onClick={() => setView('transactions')} className="text-xs text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] inline-flex items-center gap-1 transition-colors">
                Voir tout <ChevronRight size={12}/>
              </button>
            </div>
            <div className="divide-y divide-[var(--color-w-border)]">
              {recentTx.map(tx => {
                const cat = categories.find(c => c.id === tx.categoryId);
                const acc = visibleAccounts.find(a => a.id === tx.accountId);
                return (
                  <div key={tx.id} className="flex items-center gap-3 py-3 first:pt-0 last:pb-0">
                    <div className="w-9 h-9 rounded-[var(--radius-w-sm)] flex items-center justify-center text-sm shrink-0" style={{ background: (cat?.color || '#888') + '22', color: cat?.color || '#888' }}>{cat?.icon || '·'}</div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--color-w-text)] truncate">{tx.label || 'Sans libellé'}</div>
                      <div className="text-xs text-[var(--color-w-muted)] truncate">{formatDate(tx.date)} · {acc?.name}</div>
                    </div>
                    <div className={`text-sm w-num ${tx.amount >= 0 ? 'text-[var(--color-w-accent)]' : 'text-[var(--color-w-text)]'}`}>{fmt(tx.amount, { sign: true })}</div>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </div>

      {/* Achievements — discreet footer */}
      {achievements.length > 0 && (
        <section className={`${cardCls} p-6`}>
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Award size={15} className="text-[var(--color-w-accent)]"/>
              <h3 className="text-sm font-semibold text-[var(--color-w-text)]">Vos succès</h3>
            </div>
            <span className="text-xs text-[var(--color-w-faint)]">{achievements.length}/{ACHIEVEMENT_DEFS.length}</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {ACHIEVEMENT_DEFS.filter(a => achievements.includes(a.id)).slice(0, 8).map(a => (
              <div key={a.id} title={a.description} className="inline-flex items-center gap-2 px-3 h-8 rounded-full bg-[var(--color-w-surface-2)] border border-[var(--color-w-border)] text-xs text-[var(--color-w-text)]">
                <span>{a.icon}</span>
                <span>{a.name}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
// ============================================================================
// MONTHLY (Suivi Mensuel)
// ============================================================================
function Monthly({ transactions, accounts, categories, recurringIds, recurringGroups, monthlyEvolution, thisMonthStats, cashflowProjection, anomalies, categoryAnalysis, toggleRecurring, memberShare, currentMonth, fmt }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [selectedCat, setSelectedCat] = useState('all');

  const availableMonths = useMemo(() => monthlyEvolution.map(m => m.month).sort((a, b) => b.localeCompare(a)), [monthlyEvolution]);
  const monthData = useMemo(() => monthlyEvolution.find(m => m.month === selectedMonth) || { income: 0, expenses: 0, net: 0, fixed: 0, variable: 0, savings: 0 }, [monthlyEvolution, selectedMonth]);
  const isCurrentMonth = selectedMonth === currentMonth;

  // Filter recurring groups that are likely to be active
  const activeRecurring = useMemo(() => {
    return recurringGroups
      .filter(rg => {
        const lastDate = new Date(rg.lastDate);
        const now = new Date();
        const monthsAgo = (now.getFullYear() - lastDate.getFullYear()) * 12 + (now.getMonth() - lastDate.getMonth());
        return monthsAgo <= 2;
      })
      .map(rg => {
        const acc = accounts.find(a => a.id === rg.accountId);
        const share = acc ? memberShare(acc) : 1;
        return { ...rg, sharedAmount: rg.avgAmount * share };
      })
      .sort((a, b) => Math.abs(b.sharedAmount) - Math.abs(a.sharedAmount));
  }, [recurringGroups, accounts, memberShare]);

  const totalFixedMonthly = activeRecurring.reduce((s, r) => s + r.sharedAmount, 0);

  // Fixed expenses calendar
  const calendarItems = useMemo(() => {
    const items = activeRecurring.map(rg => ({
      day: rg.avgDay,
      label: rg.label,
      amount: rg.sharedAmount,
      categoryId: rg.categoryId,
    })).sort((a, b) => a.day - b.day);
    return items;
  }, [activeRecurring]);

  // Selected month transactions for breakdown
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => monthKey(t.date) === selectedMonth)
      .map(t => {
        const acc = accounts.find(a => a.id === t.accountId);
        const share = acc ? memberShare(acc) : 1;
        return { ...t, sharedAmount: t.amount * share, isRecurring: recurringIds.has(t.id) };
      });
  }, [transactions, selectedMonth, accounts, recurringIds, memberShare]);

  const fixedSpent = monthTransactions.filter(t => t.amount < 0 && t.isRecurring).reduce((s, t) => s + Math.abs(t.sharedAmount), 0);
  const variableSpent = monthTransactions.filter(t => t.amount < 0 && !t.isRecurring).reduce((s, t) => s + Math.abs(t.sharedAmount), 0);
  const savingsRate = monthData.income > 0 ? (monthData.net / monthData.income) * 100 : null;

  // For Analyse approfondie section
  const catTimeData = useMemo(() => {
    const data = {};
    transactions.forEach(t => {
      if (t.amount >= 0) return;
      if (selectedCat !== 'all' && t.categoryId !== selectedCat) return;
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const m = monthKey(t.date);
      data[m] = (data[m] || 0) + Math.abs(t.amount) * share;
    });
    return Object.entries(data).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions, selectedCat, accounts, memberShare]);

  const topMerchants = useMemo(() => {
    const m = {};
    transactions.forEach(t => {
      if (t.amount >= 0) return;
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const key = (t.label || '').slice(0, 30);
      if (!m[key]) m[key] = { label: key, total: 0, count: 0 };
      m[key].total += Math.abs(t.amount) * share;
      m[key].count += 1;
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [transactions, accounts, memberShare]);

  // Category comparison (this month vs prev 3-month avg)
  const monthVsAvg = useMemo(() => {
    return Object.entries(categoryAnalysis)
      .filter(([_, data]) => data.current > 0 || data.avg3m > 30)
      .map(([catId, data]) => {
        const cat = categories.find(c => c.id === catId);
        const change = data.avg3m > 0 ? ((data.current - data.avg3m) / data.avg3m) * 100 : (data.current > 0 ? 100 : 0);
        return { id: catId, name: cat?.name, icon: cat?.icon, color: cat?.color, current: data.current, avg: data.avg3m, change };
      })
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 10);
  }, [categoryAnalysis, categories]);

  return (
    <div className="monthly-view">
      <div className="monthly-header">
        <div>
          <h1 className="page-title">Suivi mensuel</h1>
          <p className="page-subtitle">Revenus, dépenses, charges fixes · cash-flow du mois en cours</p>
        </div>
        <select className="month-selector" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatDate(m + '-01', { format: 'monthLong' })}{m === currentMonth ? ' (en cours)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Month overview KPIs */}
      <section className="monthly-kpis">
        <div className="mk-card income">
          <div className="mk-icon"><TrendingUp size={18}/></div>
          <div className="mk-info">
            <div className="mk-label">Revenus</div>
            <div className="mk-value"><AnimatedNumber value={monthData.income} format={(v) => fmt(v)}/></div>
          </div>
        </div>
        <div className="mk-card fixed">
          <div className="mk-icon"><Repeat size={18}/></div>
          <div className="mk-info">
            <div className="mk-label">Charges fixes</div>
            <div className="mk-value"><AnimatedNumber value={fixedSpent} format={(v) => fmt(v)}/></div>
            <div className="mk-meta">{monthData.expenses > 0 ? Math.round((fixedSpent / monthData.expenses) * 100) : 0}% des dépenses</div>
          </div>
        </div>
        <div className="mk-card variable">
          <div className="mk-icon"><Activity size={18}/></div>
          <div className="mk-info">
            <div className="mk-label">Dépenses variables</div>
            <div className="mk-value"><AnimatedNumber value={variableSpent} format={(v) => fmt(v)}/></div>
            <div className="mk-meta">{monthData.expenses > 0 ? Math.round((variableSpent / monthData.expenses) * 100) : 0}% des dépenses</div>
          </div>
        </div>
        <div className={`mk-card net ${monthData.net >= 0 ? 'positive' : 'negative'}`}>
          <div className="mk-icon">{monthData.net >= 0 ? <ArrowUp size={18}/> : <ArrowDown size={18}/>}</div>
          <div className="mk-info">
            <div className="mk-label">Solde net</div>
            <div className="mk-value"><AnimatedNumber value={monthData.net} format={(v) => fmt(v, { sign: true })}/></div>
          </div>
        </div>
        <div className={`mk-card savings-rate ${savingsRate === null ? '' : savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? 'neutral' : 'negative'}`}>
          <div className="mk-icon"><PiggyBank size={18}/></div>
          <div className="mk-info">
            <div className="mk-label">Taux d'épargne</div>
            <div className="mk-value">{savingsRate !== null ? `${savingsRate.toFixed(1)}%` : '—'}</div>
            <div className="mk-meta">{savingsRate !== null ? (savingsRate >= 20 ? '✓ excellent' : savingsRate >= 10 ? '⚡ correct' : '⚠ faible') : 'Pas de revenus'}</div>
          </div>
        </div>
      </section>

      {/* Cashflow projection (only for current month) */}
      {isCurrentMonth && cashflowProjection && (
        <section className="card projection-card">
          <div className="card-header">
            <h3><Zap size={16}/> Projection fin de mois</h3>
            <span className="card-meta">À J+{cashflowProjection.elapsed}% · {cashflowProjection.daysLeft} jours restants</span>
          </div>
          <div className="projection-grid">
            <div className="proj-item">
              <div className="proj-label">Revenus projetés</div>
              <div className="proj-value positive">{fmt(cashflowProjection.projectedIncome)}</div>
            </div>
            <div className="proj-item">
              <div className="proj-label">Dépenses projetées</div>
              <div className="proj-value negative">{fmt(cashflowProjection.projectedExpenses)}</div>
            </div>
            <div className="proj-item highlight">
              <div className="proj-label">Solde projeté</div>
              <div className={`proj-value ${cashflowProjection.projectedNet >= 0 ? 'positive' : 'negative'}`}>
                {fmt(cashflowProjection.projectedNet, { sign: true })}
              </div>
            </div>
          </div>
          <div className="proj-bar">
            <div className="proj-bar-fill" style={{ width: `${cashflowProjection.elapsed}%` }}/>
          </div>
        </section>
      )}

      {/* Anomalies for selected month */}
      {isCurrentMonth && anomalies.length > 0 && (
        <section className="card alert-card">
          <div className="card-header">
            <h3><AlertTriangle size={16} style={{ color: '#f59e0b' }}/> Anomalies détectées</h3>
          </div>
          <div className="anomalies-list">
            {anomalies.map(a => (
              <div key={a.categoryId} className="anomaly-item">
                <span className="anomaly-icon" style={{ background: (a.color || '#999') + '22', color: a.color }}>{a.icon}</span>
                <div className="anomaly-text">
                  <strong>{a.name}</strong>
                  <span>{fmt(a.current)} ce mois vs {fmt(a.avg)} habituel</span>
                </div>
                <div className="anomaly-ratio">×{a.ratio.toFixed(1)}</div>
              </div>
            ))}
          </div>
        </section>
      )}

      <div className="monthly-grid">
        {/* Recurring expenses (fixed charges) */}
        <section className="card recurring-card">
          <div className="card-header">
            <h3><Repeat size={16}/> Charges fixes récurrentes</h3>
            <span className="card-meta">{activeRecurring.length} détectées · {fmt(Math.abs(totalFixedMonthly))}/mois en moyenne</span>
          </div>
          {activeRecurring.length === 0 ? (
            <div className="empty-mini">
              <Repeat size={24}/>
              <p>Importez plus de transactions pour détecter automatiquement vos charges récurrentes</p>
            </div>
          ) : (
            <div className="recurring-list-detailed">
              {activeRecurring.slice(0, 12).map((rg, idx) => {
                const cat = categories.find(c => c.id === rg.categoryId);
                return (
                  <div key={idx} className="recurring-detailed-item">
                    <div className="rec-day-badge">
                      <span className="rec-day-num">{rg.avgDay}</span>
                      <span className="rec-day-suffix">du mois</span>
                    </div>
                    <div className="rec-detailed-info">
                      <div className="rec-detailed-label">
                        <span className="rec-icon-mini" style={{ background: (cat?.color || '#999') + '22', color: cat?.color }}>{cat?.icon || '🔁'}</span>
                        <strong>{rg.label || 'Sans libellé'}</strong>
                      </div>
                      <div className="rec-detailed-meta">
                        <span>{cat?.name}</span>
                        <span>·</span>
                        <span>{rg.count}× sur {rg.months} mois</span>
                      </div>
                    </div>
                    <div className="rec-amount-large">{fmt(rg.sharedAmount)}</div>
                  </div>
                );
              })}
              {activeRecurring.length > 12 && (
                <div className="recurring-more">+ {activeRecurring.length - 12} autres charges récurrentes</div>
              )}
            </div>
          )}
        </section>

        {/* Calendar visualization */}
        {calendarItems.length > 0 && (
          <section className="card calendar-card">
            <div className="card-header">
              <h3><Calendar size={16}/> Calendrier des charges</h3>
            </div>
            <div className="calendar-strip">
              {Array.from({ length: 31 }, (_, i) => i + 1).map(day => {
                const itemsThisDay = calendarItems.filter(c => c.day === day);
                const totalThisDay = itemsThisDay.reduce((s, c) => s + Math.abs(c.amount), 0);
                return (
                  <div key={day} className={`cal-day ${itemsThisDay.length > 0 ? 'has-items' : ''}`}>
                    <div className="cal-day-num">{day}</div>
                    {itemsThisDay.length > 0 && (
                      <>
                        <div className="cal-day-dot" style={{ height: `${Math.min(totalThisDay / 30, 24)}px` }}/>
                        <div className="cal-day-tooltip">
                          {itemsThisDay.slice(0, 3).map((it, i) => {
                            const cat = categories.find(c => c.id === it.categoryId);
                            return <div key={i} className="cal-tooltip-item">{cat?.icon} {it.label} · {fmt(it.amount)}</div>;
                          })}
                          {itemsThisDay.length > 3 && <div className="cal-tooltip-more">+ {itemsThisDay.length - 3} autres</div>}
                        </div>
                      </>
                    )}
                  </div>
                );
              })}
            </div>
            <div className="calendar-legend">Survolez un jour pour voir le détail · taille = montant</div>
          </section>
        )}

        {/* Month vs Average comparison */}
        <section className="card">
          <div className="card-header">
            <h3>Ce mois vs moyenne</h3>
            <span className="card-meta">moyenne 3 derniers mois</span>
          </div>
          <div className="month-comparison">
            {monthVsAvg.length === 0 ? (
              <div className="empty-mini"><BarChart3 size={24}/><p>Plus de données nécessaires</p></div>
            ) : (
              monthVsAvg.map(c => (
                <div key={c.id} className="comp-row">
                  <span className="comp-icon" style={{ background: (c.color || '#999') + '22' }}>{c.icon}</span>
                  <div className="comp-info">
                    <div className="comp-name">{c.name}</div>
                    <div className="comp-amounts">
                      <span className="comp-current">{fmt(c.current)}</span>
                      <span className="comp-avg">vs {fmt(c.avg)} moy.</span>
                    </div>
                  </div>
                  {Math.abs(c.change) > 5 ? (
                    <div className={`comp-change ${c.change > 0 ? 'up' : 'down'}`}>
                      {c.change > 0 ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}
                      {Math.abs(c.change).toFixed(0)}%
                    </div>
                  ) : (
                    <div className="comp-change stable"><Minus size={11}/> stable</div>
                  )}
                </div>
              ))
            )}
          </div>
        </section>

        {/* Income vs Expenses chart */}
        <section className="card">
          <div className="card-header"><h3>Flux mensuel sur 6 mois</h3></div>
          {monthlyEvolution.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <ComposedChart data={monthlyEvolution.slice(-6)}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
                <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--text-tertiary)" fontSize={11}/>
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11}/>
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                <Legend wrapperStyle={{ fontSize: 12 }}/>
                <Bar dataKey="income" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]}/>
                <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]}/>
                <Line type="monotone" dataKey="net" name="Solde net" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 4 }}/>
              </ComposedChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty"><BarChart3 size={28}/><span>Pas encore de données</span></div>}
        </section>
      </div>

      {/* ── Analyse approfondie ── */}
      <div className="analyse-section-header">
        <BarChart3 size={16}/>
        <h2>Analyse approfondie</h2>
        <span className="analyse-section-subtitle">Historique complet · Top marchands · Évolution par poste</span>
      </div>

      <section className="card">
        <div className="card-header"><h3>Évolution revenus / dépenses sur 12 mois</h3></div>
        {monthlyEvolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyEvolution.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
              <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--text-tertiary)" fontSize={11}/>
              <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11}/>
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
              <Legend wrapperStyle={{ fontSize: 12 }}/>
              <Bar dataKey="income" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]}/>
              <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">Pas de données</div>}
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header"><h3>Top marchands</h3><span className="card-meta">toutes périodes</span></div>
          {topMerchants.length === 0 ? (
            <div className="empty-mini"><BarChart3 size={24}/><p>Aucune donnée</p></div>
          ) : (
            <div className="merchants-list">
              {topMerchants.map((m, idx) => (
                <div key={idx} className="merchant-row">
                  <div className="merchant-rank">{String(idx + 1).padStart(2, '0')}</div>
                  <div className="merchant-info">
                    <div className="merchant-name">{m.label || 'Sans libellé'}</div>
                    <div className="merchant-meta">{m.count} transaction{m.count > 1 ? 's' : ''}</div>
                  </div>
                  <div className="merchant-total">{fmt(m.total)}</div>
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Évolution par catégorie</h3>
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
              <option value="all">Toutes dépenses</option>
              {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {catTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={catTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
                <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--text-tertiary)" fontSize={11}/>
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11}/>
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty">Aucune donnée</div>}
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// BUDGETS (revamped)
// ============================================================================
function Budgets({ categories, budgets, setBudget, categoryAnalysis, fiftyThirtyTwenty, thisMonthStats, cashflowProjection, goals, saveGoal, deleteGoal, fmt }) {
  const [showGoalEditor, setShowGoalEditor] = useState(null);
  const [budgetMode, setBudgetMode] = useState('balanced'); // balanced | strict | flexible

  const expenseCats = categories.filter(c => c.type === 'expense' && c.id !== 'uncategorized');

  // 50/30/20 calculations
  const total50 = fiftyThirtyTwenty.total || 1;
  const needsRatio = (fiftyThirtyTwenty.needs / total50) * 100;
  const wantsRatio = (fiftyThirtyTwenty.wants / total50) * 100;
  const savingsRatio = (fiftyThirtyTwenty.savings / total50) * 100;

  // Income suggestion targets
  const income = thisMonthStats.income;
  const target50 = income * 0.5;
  const target30 = income * 0.3;
  const target20 = income * 0.2;

  // Budget summary stats
  const totalBudget = Object.values(budgets).reduce((s, b) => s + (b || 0), 0);
  const totalSpent = Object.entries(budgets).reduce((s, [catId, budget]) => s + (categoryAnalysis[catId]?.current || 0), 0);
  const budgetsRespected = Object.entries(budgets).filter(([catId, budget]) => budget > 0 && (categoryAnalysis[catId]?.current || 0) <= budget).length;
  const budgetsOver = Object.entries(budgets).filter(([catId, budget]) => budget > 0 && (categoryAnalysis[catId]?.current || 0) > budget).length;

  // Reste à vivre
  const restToLive = income - thisMonthStats.fixed - (totalBudget - Object.entries(budgets).reduce((s, [catId, b]) => s + (b || 0), 0));
  const remainingDays = cashflowProjection?.daysLeft || 0;
  const dailyBudget = remainingDays > 0 ? restToLive / remainingDays : 0;

  return (
    <div className="budgets-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Budgets intelligents</h1>
          <p className="page-subtitle">Méthode 50/30/20 et budget par catégorie · automatiques sur la base de vos 3 derniers mois</p>
        </div>
      </div>

      {/* 50/30/20 visualization */}
      <section className="card budget-50-30-20">
        <div className="card-header">
          <h3><Target size={16}/> Méthode 50/30/20</h3>
          <span className="card-meta">Besoins / Envies / Épargne</span>
        </div>

        <div className="ratio-display">
          <div className="ratio-bar-large">
            <div className="ratio-segment needs" style={{ flex: fiftyThirtyTwenty.needs }}>
              {needsRatio > 8 && <span className="ratio-pct">{needsRatio.toFixed(0)}%</span>}
            </div>
            <div className="ratio-segment wants" style={{ flex: fiftyThirtyTwenty.wants }}>
              {wantsRatio > 8 && <span className="ratio-pct">{wantsRatio.toFixed(0)}%</span>}
            </div>
            <div className="ratio-segment savings" style={{ flex: fiftyThirtyTwenty.savings }}>
              {savingsRatio > 8 && <span className="ratio-pct">{savingsRatio.toFixed(0)}%</span>}
            </div>
          </div>

          <div className="ratio-cards">
            <div className="ratio-card needs">
              <div className="ratio-card-header">
                <div className="ratio-card-pct">{needsRatio.toFixed(0)}%</div>
                <div className="ratio-card-target">cible 50%</div>
              </div>
              <div className="ratio-card-name">Besoins essentiels</div>
              <div className="ratio-card-amount">{fmt(fiftyThirtyTwenty.needs)}</div>
              {income > 0 && (
                <div className="ratio-card-target-amount">
                  Cible : {fmt(target50)}
                  {fiftyThirtyTwenty.needs > target50 ? <span className="status over">×{(fiftyThirtyTwenty.needs / target50).toFixed(1)}</span> : <span className="status ok"><Check size={11}/></span>}
                </div>
              )}
            </div>
            <div className="ratio-card wants">
              <div className="ratio-card-header">
                <div className="ratio-card-pct">{wantsRatio.toFixed(0)}%</div>
                <div className="ratio-card-target">cible 30%</div>
              </div>
              <div className="ratio-card-name">Envies & loisirs</div>
              <div className="ratio-card-amount">{fmt(fiftyThirtyTwenty.wants)}</div>
              {income > 0 && (
                <div className="ratio-card-target-amount">
                  Cible : {fmt(target30)}
                  {fiftyThirtyTwenty.wants > target30 ? <span className="status over">×{(fiftyThirtyTwenty.wants / target30).toFixed(1)}</span> : <span className="status ok"><Check size={11}/></span>}
                </div>
              )}
            </div>
            <div className="ratio-card savings">
              <div className="ratio-card-header">
                <div className="ratio-card-pct">{savingsRatio.toFixed(0)}%</div>
                <div className="ratio-card-target">cible 20%</div>
              </div>
              <div className="ratio-card-name">Épargne & invest</div>
              <div className="ratio-card-amount">{fmt(fiftyThirtyTwenty.savings)}</div>
              {income > 0 && (
                <div className="ratio-card-target-amount">
                  Cible : {fmt(target20)}
                  {fiftyThirtyTwenty.savings >= target20 ? <span className="status ok"><Check size={11}/></span> : <span className="status under">manque {fmt(target20 - fiftyThirtyTwenty.savings)}</span>}
                </div>
              )}
            </div>
          </div>
        </div>

        <div className="ratio-help">
          <Lightbulb size={14}/>
          <span><strong>Comment ça marche :</strong> 50% pour les <em>besoins</em> (logement, courses, transport, factures), 30% pour les <em>envies</em> (resto, loisirs, shopping), 20% pour l'<em>épargne</em>. Vos catégories sont déjà classées automatiquement.</span>
        </div>
      </section>

      {/* Reste à vivre */}
      {income > 0 && (
        <section className="card rest-to-live">
          <div className="card-header">
            <h3><Wallet size={16}/> Reste à vivre</h3>
          </div>
          <div className="rest-grid">
            <div className="rest-item">
              <div className="rest-label">Revenus</div>
              <div className="rest-value">{fmt(income)}</div>
            </div>
            <div className="rest-arrow">−</div>
            <div className="rest-item">
              <div className="rest-label">Charges fixes</div>
              <div className="rest-value">{fmt(thisMonthStats.fixed)}</div>
            </div>
            <div className="rest-arrow">=</div>
            <div className="rest-item highlight">
              <div className="rest-label">Disponible</div>
              <div className="rest-value">{fmt(income - thisMonthStats.fixed)}</div>
              {remainingDays > 0 && (
                <div className="rest-meta">≈ {fmt(dailyBudget)} / jour sur {remainingDays}j</div>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Budget summary */}
      {totalBudget > 0 && (
        <section className="budget-summary">
          <div className="bs-card respected"><div className="bs-num">{budgetsRespected}</div><div className="bs-label">Respectés</div></div>
          <div className="bs-card over"><div className="bs-num">{budgetsOver}</div><div className="bs-label">Dépassés</div></div>
          <div className="bs-card total">
            <div className="bs-num">{Math.round((totalSpent / totalBudget) * 100)}%</div>
            <div className="bs-label">Utilisation globale</div>
          </div>
        </section>
      )}

      {/* Per-category budgets */}
      <section className="card">
        <div className="card-header">
          <h3>Budget par catégorie</h3>
          <span className="card-meta">Suggestions basées sur votre moyenne 3 mois</span>
        </div>
        <div className="budget-list">
          {expenseCats.map(cat => {
            const analysis = categoryAnalysis[cat.id] || { current: 0, avg3m: 0 };
            const spent = analysis.current;
            const budget = budgets[cat.id] || 0;
            const suggestion = Math.ceil(analysis.avg3m / 10) * 10;
            const pct = budget > 0 ? (spent / budget) * 100 : 0;
            const status = pct < 70 ? 'ok' : pct < 100 ? 'warning' : 'danger';
            const projection = cashflowProjection && spent > 0 ? (spent / Math.max(cashflowProjection.elapsed, 5)) * 100 : 0;

            return (
              <div key={cat.id} className={`budget-item-v2 ${budget > 0 && pct >= 100 ? 'over' : ''}`}>
                <div className="budget-item-header">
                  <div className="budget-info">
                    <span className="budget-icon" style={{ background: cat.color + '22', color: cat.color }}>{cat.icon}</span>
                    <div className="budget-info-text">
                      <span className="budget-name">{cat.name}</span>
                      <span className="budget-kind">{cat.kind === 'needs' ? 'Besoin' : cat.kind === 'wants' ? 'Envie' : 'Épargne'}</span>
                    </div>
                  </div>
                  <div className="budget-amounts">
                    <span className="budget-spent">{fmt(spent)}</span>
                    <span className="budget-divider">/</span>
                    <input type="number" placeholder={suggestion > 0 ? `~${suggestion}` : '—'} value={budget || ''} onChange={(e) => setBudget(cat.id, e.target.value)} className="budget-input"/>
                    <span className="budget-currency">€</span>
                  </div>
                </div>

                {budget > 0 && (
                  <>
                    <div className={`budget-bar ${status}`}>
                      <div className="budget-fill" style={{ width: `${Math.min(pct, 100)}%` }}/>
                      {projection > 100 && projection < 200 && (
                        <div className="budget-projection-marker" style={{ left: `${Math.min(projection, 100)}%` }} title={`Projection: ${projection.toFixed(0)}%`}/>
                      )}
                    </div>
                    <div className="budget-meta">
                      <span>{pct.toFixed(0)}% utilisé</span>
                      {suggestion > 0 && Math.abs(suggestion - budget) > 5 && (
                        <button className="suggestion-btn" onClick={() => setBudget(cat.id, suggestion)}>
                          <Lightbulb size={10}/> Suggérer {fmt(suggestion)}
                        </button>
                      )}
                      {pct > 80 && pct < 100 && <span className="budget-warning">⚠️ Bientôt dépassé</span>}
                      {pct >= 100 && <span className="budget-danger">🚨 Dépassé de {fmt(spent - budget)}</span>}
                    </div>
                  </>
                )}

                {!budget && analysis.avg3m > 0 && (
                  <button className="quick-set-btn" onClick={() => setBudget(cat.id, suggestion)}>
                    <Plus size={11}/> Définir un budget de {fmt(suggestion)} (basé sur votre moyenne)
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Goals */}
      <section className="card">
        <div className="card-header">
          <h3><Target size={16}/> Objectifs d'épargne</h3>
          <button className="secondary-btn" onClick={() => setShowGoalEditor({ id: null, name: '', target: 0, current: 0, deadline: '', emoji: '🎯' })}>
            <Plus size={14}/> Nouvel objectif
          </button>
        </div>
        {goals.length === 0 ? (
          <div className="empty-mini">
            <Target size={28}/>
            <p>Définissez des objectifs (vacances, voiture, apport immo…) et suivez votre progression.</p>
          </div>
        ) : (
          <div className="goals-grid">
            {goals.map(g => {
              const progress = g.target > 0 ? Math.min((g.current / g.target) * 100, 100) : 0;
              const remaining = Math.max(0, g.target - g.current);
              const daysLeft = g.deadline ? Math.max(0, Math.ceil((new Date(g.deadline) - new Date()) / (1000 * 60 * 60 * 24))) : null;
              return (
                <div key={g.id} className="goal-card">
                  <div className="goal-header">
                    <div className="goal-emoji">{g.emoji || '🎯'}</div>
                    <div className="goal-info">
                      <div className="goal-name">{g.name}</div>
                      {g.deadline && <div className="goal-deadline">Pour le {formatDate(g.deadline, { format: 'long' })} · {daysLeft}j restants</div>}
                    </div>
                    <button className="icon-btn-sm" onClick={() => setShowGoalEditor(g)}><Edit3 size={13}/></button>
                  </div>
                  <div className="goal-amounts">
                    <span className="goal-current">{fmt(g.current)}</span>
                    <span className="goal-divider">/</span>
                    <span className="goal-target">{fmt(g.target)}</span>
                  </div>
                  <div className="goal-progress-bar">
                    <div className="goal-progress-fill" style={{ width: `${progress}%` }}/>
                  </div>
                  <div className="goal-meta">
                    <span className="goal-pct">{progress.toFixed(0)}%</span>
                    {remaining > 0 && <span>encore {fmt(remaining)}</span>}
                    {progress >= 100 && <span className="goal-complete">🎉 Atteint !</span>}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {showGoalEditor && (
        <GoalEditor goal={showGoalEditor} onSave={(g) => { saveGoal(g); setShowGoalEditor(null); }} onCancel={() => setShowGoalEditor(null)} onDelete={showGoalEditor.id ? () => { deleteGoal(showGoalEditor.id); setShowGoalEditor(null); } : null}/>
      )}
    </div>
  );
}

function GoalEditor({ goal, onSave, onCancel, onDelete }) {
  const [draft, setDraft] = useState(goal);
  const EMOJIS = ['🎯', '🏖️', '🏠', '🚗', '🎓', '💍', '👶', '🌍', '💼', '🏖️', '🎁', '✈️'];
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{goal.id ? 'Modifier l\'objectif' : 'Nouvel objectif'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label><span>Emoji</span>
            <div className="emoji-picker">
              {EMOJIS.map(e => (
                <button key={e} className={`emoji-pick ${draft.emoji === e ? 'active' : ''}`} onClick={() => setDraft({ ...draft, emoji: e })}>{e}</button>
              ))}
            </div>
          </label>
          <label><span>Nom de l'objectif</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ex: Vacances été 2026, Apport maison"/>
          </label>
          <div className="field-row">
            <label><span>Montant cible (€)</span>
              <input type="number" value={draft.target} onChange={(e) => setDraft({ ...draft, target: parseFloat(e.target.value) || 0 })}/>
            </label>
            <label><span>Déjà épargné (€)</span>
              <input type="number" value={draft.current} onChange={(e) => setDraft({ ...draft, current: parseFloat(e.target.value) || 0 })}/>
            </label>
          </div>
          <label><span>Échéance (optionnel)</span>
            <input type="date" value={draft.deadline || ''} onChange={(e) => setDraft({ ...draft, deadline: e.target.value })}/>
          </label>
        </div>
        <div className="modal-footer">
          {onDelete && <button className="danger-btn-sm" onClick={onDelete}><Trash2 size={13}/> Supprimer</button>}
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <button className="primary-btn" onClick={() => { if (draft.name && draft.target > 0) onSave(draft); }}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
// ============================================================================
// WEALTH (Assets + Liabilities)
// ============================================================================
function Wealth({ assets, liabilities, members, activeMemberId, visibleAssets, visibleLiabilities, saveAsset, deleteAsset, saveLiability, deleteLiability, memberShare, fmt, wealthHistory = [] }) {
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLia, setEditingLia] = useState(null);

  const assetsByType = useMemo(() => {
    const groups = {};
    visibleAssets.forEach(a => {
      if (!groups[a.type]) groups[a.type] = [];
      groups[a.type].push(a);
    });
    return groups;
  }, [visibleAssets]);

  const totalAssets = visibleAssets.reduce((s, a) => s + (parseFloat(a.currentValue) || 0) * memberShare(a), 0);
  const totalLiabilities = visibleLiabilities.reduce((s, l) => s + (parseFloat(l.remainingCapital) || 0) * memberShare(l), 0);
  const netWealthAssets = totalAssets - totalLiabilities;

  // Asset class allocation for donut chart
  const classAllocation = useMemo(() => {
    const classes = {};
    visibleAssets.forEach(a => {
      const cls = ASSET_CLASS_MAP[a.type]?.class || 'Divers';
      const color = ASSET_CLASS_MAP[a.type]?.color || '#6b7280';
      const val = (parseFloat(a.currentValue) || 0) * memberShare(a);
      if (!classes[cls]) classes[cls] = { value: 0, color };
      classes[cls].value += val;
    });
    return Object.entries(classes).filter(([, d]) => d.value > 0)
      .map(([name, d]) => ({ name, value: d.value, color: d.color, pct: totalAssets > 0 ? (d.value / totalAssets) * 100 : 0 }))
      .sort((a, b) => b.value - a.value);
  }, [visibleAssets, memberShare, totalAssets]);

  // Private wealth KPIs
  const debtRatioWealth = totalAssets > 0 ? (totalLiabilities / totalAssets) * 100 : null;
  const totalMonthlyDebt = visibleLiabilities.reduce((s, l) => s + (parseFloat(l.monthlyPayment) || 0) * memberShare(l), 0);
  const iliquidAssets = visibleAssets.filter(a => ['real_estate'].includes(a.type))
    .reduce((s, a) => s + (parseFloat(a.currentValue) || 0) * memberShare(a), 0);
  const illiquidRatio = totalAssets > 0 ? (iliquidAssets / totalAssets) * 100 : null;

  return (
    <div className="wealth-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Patrimoine</h1>
          <p className="page-subtitle">Actifs · passifs · allocation par classe · indicateurs gestion privée</p>
        </div>
      </div>

      {/* Patrimoine history — only shown once we have at least 2 snapshots */}
      {wealthHistory.length >= 2 && (
        <section className="card chart-card">
          <div className="card-header">
            <h3>Évolution du patrimoine net</h3>
            <span className="card-meta">{wealthHistory.length} mois · snapshot mensuel automatique</span>
          </div>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={wealthHistory} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="netWorthGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.3}/>
                  <stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false}/>
              <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false}/>
              <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={55}/>
              <Tooltip
                contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
                cursor={{ stroke: 'var(--border-strong)', strokeWidth: 1 }}
                formatter={(v, key) => {
                  const labels = { net_worth: 'Patrimoine net', liquid_wealth: 'Liquidités', assets_value: 'Actifs', liabilities_value: 'Dettes' };
                  return [formatCurrency(v), labels[key] || key];
                }}
                labelFormatter={(m) => formatDate(m + '-01', { format: 'long' })}
              />
              <Area type="monotone" dataKey="net_worth" stroke="var(--primary)" strokeWidth={2} fill="url(#netWorthGrad)"/>
            </AreaChart>
          </ResponsiveContainer>
        </section>
      )}

      {/* Private wealth KPI strip */}
      {totalAssets > 0 && (
        <section className="wealth-kpis">
          <div className="wk-card">
            <div className="wk-label">Actif net</div>
            <div className="wk-value">{fmt(netWealthAssets)}</div>
            <div className="wk-meta">{fmt(totalAssets)} d'actifs</div>
          </div>
          {debtRatioWealth !== null && (
            <div className={`wk-card ${debtRatioWealth > 50 ? 'warn' : ''}`}>
              <div className="wk-label">Ratio d'endettement</div>
              <div className="wk-value">{debtRatioWealth.toFixed(1)}%</div>
              <div className="wk-meta">{debtRatioWealth < 30 ? '✓ faible' : debtRatioWealth < 50 ? '⚡ modéré' : '⚠ élevé'}</div>
            </div>
          )}
          {illiquidRatio !== null && (
            <div className="wk-card">
              <div className="wk-label">Part immobilier</div>
              <div className="wk-value">{illiquidRatio.toFixed(1)}%</div>
              <div className="wk-meta">{illiquidRatio > 70 ? 'peu diversifié' : '✓ équilibré'}</div>
            </div>
          )}
          {totalMonthlyDebt > 0 && (
            <div className="wk-card">
              <div className="wk-label">Mensualités totales</div>
              <div className="wk-value">{fmt(totalMonthlyDebt)}</div>
              <div className="wk-meta">/mois (tous prêts)</div>
            </div>
          )}
        </section>
      )}

      {/* Asset class allocation */}
      {classAllocation.length > 0 && (
        <section className="card allocation-card">
          <div className="card-header"><h3><BarChart3 size={16}/> Allocation par classe d'actifs</h3></div>
          <div className="allocation-body">
            <ResponsiveContainer width={200} height={200}>
              <PieChart>
                <Pie data={classAllocation} dataKey="value" cx="50%" cy="50%" innerRadius={55} outerRadius={88} paddingAngle={2}>
                  {classAllocation.map((entry, i) => <Cell key={i} fill={entry.color}/>)}
                </Pie>
                <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
              </PieChart>
            </ResponsiveContainer>
            <div className="allocation-legend">
              {classAllocation.map((c, i) => (
                <div key={i} className="alloc-row">
                  <div className="alloc-dot" style={{ background: c.color }}/>
                  <div className="alloc-name">{c.name}</div>
                  <div className="alloc-pct">{c.pct.toFixed(1)}%</div>
                  <div className="alloc-val">{fmt(c.value)}</div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="wealth-summary">
        <div className="ws-card positive">
          <div className="ws-icon"><Landmark size={20}/></div>
          <div className="ws-content">
            <div className="ws-label">Total actifs</div>
            <div className="ws-value"><AnimatedNumber value={totalAssets} format={(v) => fmt(v)}/></div>
            <div className="ws-meta">{visibleAssets.length} actif{visibleAssets.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="ws-card negative">
          <div className="ws-icon"><CreditCard size={20}/></div>
          <div className="ws-content">
            <div className="ws-label">Total passifs</div>
            <div className="ws-value"><AnimatedNumber value={totalLiabilities} format={(v) => fmt(v)}/></div>
            <div className="ws-meta">{visibleLiabilities.length} prêt{visibleLiabilities.length > 1 ? 's' : ''}</div>
          </div>
        </div>
        <div className="ws-card net">
          <div className="ws-icon"><Sparkles size={20}/></div>
          <div className="ws-content">
            <div className="ws-label">Patrimoine (hors liquidités)</div>
            <div className="ws-value"><AnimatedNumber value={totalAssets - totalLiabilities} format={(v) => fmt(v)}/></div>
          </div>
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3><Wallet size={16}/> Actifs</h3>
          <button className="secondary-btn" onClick={() => setEditingAsset({ id: null, type: 'real_estate', name: '', currentValue: 0, memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', updatedAt: new Date().toISOString() })}>
            <Plus size={14}/> Ajouter
          </button>
        </div>

        {Object.keys(assetsByType).length === 0 ? (
          <div className="wealth-empty">
            <p>Aucun actif renseigné. Choisissez un type pour commencer :</p>
            <div className="asset-types-grid">
              {ASSET_TYPES.map(t => {
                const Icon = t.icon;
                return (
                  <button key={t.id} className="asset-type-btn" onClick={() => setEditingAsset({ id: null, type: t.id, name: '', currentValue: 0, memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', updatedAt: new Date().toISOString() })}>
                    <div className="att-icon" style={{ background: t.color + '22', color: t.color }}><Icon size={20}/></div>
                    <div className="att-text">
                      <div className="att-name">{t.name}</div>
                      <div className="att-desc">{t.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ) : (
          ASSET_TYPES.map(type => {
            const list = assetsByType[type.id];
            if (!list || list.length === 0) return null;
            const Icon = type.icon;
            const subtotal = list.reduce((s, a) => s + (parseFloat(a.currentValue) || 0) * memberShare(a), 0);
            return (
              <div key={type.id} className="asset-group">
                <div className="asset-group-header">
                  <div className="agh-icon" style={{ background: type.color + '22', color: type.color }}><Icon size={14}/></div>
                  <span className="agh-name">{type.name}</span>
                  <span className="agh-count">{list.length}</span>
                  <span className="agh-total">{fmt(subtotal)}</span>
                </div>
                <div className="asset-list">
                  {list.map(a => {
                    const owners = (a.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');
                    return (
                      <div key={a.id} className="asset-card-v2">
                        <div className="asset-card-main">
                          <div className="asset-card-name">{a.name}</div>
                          <div className="asset-card-meta">{owners} · MAJ {formatDate(a.updatedAt)}</div>
                          {a.notes && <div className="asset-card-notes">{a.notes}</div>}
                        </div>
                        <div className="asset-card-value">{fmt((parseFloat(a.currentValue) || 0) * memberShare(a))}</div>
                        <div className="asset-card-actions">
                          <button className="icon-btn-sm" onClick={() => setEditingAsset(a)}><Edit3 size={13}/></button>
                          <button className="icon-btn-sm" onClick={() => deleteAsset(a.id)}><Trash2 size={13}/></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })
        )}
      </section>

      <section className="card">
        <div className="card-header">
          <h3><CreditCard size={16}/> Prêts en cours</h3>
          <button className="secondary-btn" onClick={() => setEditingLia({ id: null, type: 'mortgage', name: '', initialCapital: 0, remainingCapital: 0, monthlyPayment: 0, interestRate: 0, endDate: '', memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '' })}>
            <Plus size={14}/> Ajouter
          </button>
        </div>
        {visibleLiabilities.length === 0 ? (
          <div className="wealth-empty"><p>Aucun prêt renseigné.</p></div>
        ) : (
          <div className="liability-list">
            {visibleLiabilities.map(l => {
              const type = LIABILITY_TYPES.find(t => t.id === l.type) || LIABILITY_TYPES[0];
              const Icon = type.icon;
              const owners = (l.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');
              const progress = l.initialCapital > 0 ? ((l.initialCapital - l.remainingCapital) / l.initialCapital) * 100 : 0;
              return (
                <div key={l.id} className="liability-card-v2">
                  <div className="lia-header">
                    <div className="lia-icon" style={{ background: type.color + '22', color: type.color }}><Icon size={14}/></div>
                    <div className="lia-name-block">
                      <span className="lia-name">{l.name}</span>
                      <span className="lia-type">{type.name}</span>
                    </div>
                    <div className="lia-actions">
                      <button className="icon-btn-sm" onClick={() => setEditingLia(l)}><Edit3 size={13}/></button>
                      <button className="icon-btn-sm" onClick={() => deleteLiability(l.id)}><Trash2 size={13}/></button>
                    </div>
                  </div>
                  <div className="lia-stats">
                    <div className="lia-stat"><span className="lia-label">Restant dû</span><span className="lia-value">{fmt((parseFloat(l.remainingCapital) || 0) * memberShare(l))}</span></div>
                    <div className="lia-stat"><span className="lia-label">Mensualité</span><span className="lia-value">{fmt((parseFloat(l.monthlyPayment) || 0) * memberShare(l))}</span></div>
                    <div className="lia-stat"><span className="lia-label">Taux</span><span className="lia-value">{l.interestRate}%</span></div>
                    {l.endDate && <div className="lia-stat"><span className="lia-label">Fin</span><span className="lia-value">{formatDate(l.endDate, { format: 'monthYear' })}</span></div>}
                  </div>
                  <div className="lia-progress">
                    <div className="lia-progress-bar"><div className="lia-progress-fill" style={{ width: `${progress}%` }}/></div>
                    <div className="lia-progress-info">
                      <span>{progress.toFixed(0)}% remboursé</span>
                      <span className="lia-owners">{owners}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {editingAsset && <AssetEditor asset={editingAsset} members={members} onSave={(a) => { saveAsset(a); setEditingAsset(null); }} onCancel={() => setEditingAsset(null)}/>}
      {editingLia && <LiabilityEditor liability={editingLia} members={members} onSave={(l) => { saveLiability(l); setEditingLia(null); }} onCancel={() => setEditingLia(null)}/>}
    </div>
  );
}

function AssetEditor({ asset, members, onSave, onCancel }) {
  const [draft, setDraft] = useState(asset);
  const handleSave = () => {
    if (!draft.name) { alert('Donnez un nom à cet actif'); return; }
    if (!draft.memberIds || draft.memberIds.length === 0) { alert('Assignez à au moins un membre'); return; }
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  };
  const toggleMember = (mid) => {
    const ids = draft.memberIds || [];
    setDraft({ ...draft, memberIds: ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid] });
  };
  const type = ASSET_TYPES.find(t => t.id === draft.type);
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{asset.id ? 'Modifier' : 'Nouvel actif'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label><span>Type</span>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              {ASSET_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          {type && <div className="field-help">{type.description}</div>}
          <label><span>Nom</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ex: Appartement Paris 11e, AV Linxea Spirit"/>
          </label>
          <label><span>Valeur actuelle (€)</span>
            <input type="number" value={draft.currentValue} onChange={(e) => setDraft({ ...draft, currentValue: e.target.value })} step="any"/>
          </label>
          <label><span>Propriétaires</span>
            <div className="member-checks">
              {members.map(m => (
                <label key={m.id} className={`member-check ${(draft.memberIds || []).includes(m.id) ? 'active' : ''}`} style={{ borderColor: (draft.memberIds || []).includes(m.id) ? m.color : undefined }}>
                  <input type="checkbox" checked={(draft.memberIds || []).includes(m.id)} onChange={() => toggleMember(m.id)}/>
                  <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          </label>
          <label><span>Notes (optionnel)</span>
            <textarea value={draft.notes || ''} onChange={(e) => setDraft({ ...draft, notes: e.target.value })} rows="2" placeholder="Allocation, support, etc."/>
          </label>
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <button className="primary-btn" onClick={handleSave}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

function LiabilityEditor({ liability, members, onSave, onCancel }) {
  const [draft, setDraft] = useState(liability);
  const handleSave = () => {
    if (!draft.name) { alert('Donnez un nom'); return; }
    if (!draft.memberIds || draft.memberIds.length === 0) { alert('Assignez à au moins un membre'); return; }
    onSave(draft);
  };
  const toggleMember = (mid) => {
    const ids = draft.memberIds || [];
    setDraft({ ...draft, memberIds: ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid] });
  };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{liability.id ? 'Modifier le prêt' : 'Nouveau prêt'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label><span>Type</span>
            <select value={draft.type} onChange={(e) => setDraft({ ...draft, type: e.target.value })}>
              {LIABILITY_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
            </select>
          </label>
          <label><span>Intitulé</span>
            <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="ex: Crédit immo Paris"/>
          </label>
          <div className="field-row">
            <label><span>Capital initial (€)</span>
              <input type="number" value={draft.initialCapital} onChange={(e) => setDraft({ ...draft, initialCapital: e.target.value })} step="any"/>
            </label>
            <label><span>Restant dû (€)</span>
              <input type="number" value={draft.remainingCapital} onChange={(e) => setDraft({ ...draft, remainingCapital: e.target.value })} step="any"/>
            </label>
          </div>
          <div className="field-row">
            <label><span>Mensualité (€)</span>
              <input type="number" value={draft.monthlyPayment} onChange={(e) => setDraft({ ...draft, monthlyPayment: e.target.value })} step="any"/>
            </label>
            <label><span>Taux annuel (%)</span>
              <input type="number" value={draft.interestRate} onChange={(e) => setDraft({ ...draft, interestRate: e.target.value })} step="0.01"/>
            </label>
          </div>
          <label><span>Date de fin</span>
            <input type="date" value={draft.endDate || ''} onChange={(e) => setDraft({ ...draft, endDate: e.target.value })}/>
          </label>
          <label><span>Emprunteurs</span>
            <div className="member-checks">
              {members.map(m => (
                <label key={m.id} className={`member-check ${(draft.memberIds || []).includes(m.id) ? 'active' : ''}`} style={{ borderColor: (draft.memberIds || []).includes(m.id) ? m.color : undefined }}>
                  <input type="checkbox" checked={(draft.memberIds || []).includes(m.id)} onChange={() => toggleMember(m.id)}/>
                  <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          </label>
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <button className="primary-btn" onClick={handleSave}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// TRANSACTIONS
// ============================================================================
function Transactions({ transactions, accounts, categories, recurringIds, toggleRecurring, updateCategory, deleteTransaction, fmt }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterAcc, setFilterAcc] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingTx, setEditingTx] = useState(null);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (search && !(t.label || '').toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCat !== 'all' && t.categoryId !== filterCat) return false;
        if (filterAcc !== 'all' && t.accountId !== filterAcc) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortKey === 'amount') cmp = a.amount - b.amount;
        else if (sortKey === 'label') cmp = (a.label || '').localeCompare(b.label || '');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [transactions, search, filterCat, filterAcc, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="transactions-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Toutes vos opérations · cliquez sur une catégorie pour la modifier</p>
        </div>
      </div>
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16}/>
          <input placeholder="Rechercher dans les libellés…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="all">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)}>
          <option value="all">Tous comptes</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span className="result-count">{filtered.length} transaction{filtered.length > 1 ? 's' : ''}</span>
      </div>
      <div className="tx-table">
        <div className="tx-header">
          <div className="th sortable" onClick={() => toggleSort('date')}>Date <ArrowUpDown size={12}/></div>
          <div className="th sortable" onClick={() => toggleSort('label')}>Libellé <ArrowUpDown size={12}/></div>
          <div className="th">Catégorie</div>
          <div className="th">Compte</div>
          <div className="th right sortable" onClick={() => toggleSort('amount')}>Montant <ArrowUpDown size={12}/></div>
          <div className="th"></div>
        </div>
        <div className="tx-body">
          {filtered.slice(0, 200).map(tx => {
            const cat = categories.find(c => c.id === tx.categoryId);
            const acc = accounts.find(a => a.id === tx.accountId);
            const isRecurring = recurringIds.has(tx.id);
            return (
              <div key={tx.id} className="tx-row">
                <div className="td td-date">{formatDate(tx.date)}</div>
                <div className="td td-label">
                  <span>{tx.label || 'Sans libellé'}</span>
                  <button className={`recurring-toggle ${isRecurring ? 'active' : ''}`} onClick={() => toggleRecurring(tx.id, !isRecurring)} title={isRecurring ? 'Marquer comme non-récurrent' : 'Marquer comme récurrent'}>
                    <Repeat size={11}/>
                  </button>
                </div>
                <div className="td td-cat">
                  {editingTx === tx.id ? (
                    <select autoFocus defaultValue={tx.categoryId || ''} onBlur={() => setEditingTx(null)} onChange={(e) => { updateCategory(tx.id, e.target.value); setEditingTx(null); }}>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
                    </select>
                  ) : (
                    <button className="cat-pill" style={{ background: (cat?.color || '#999') + '1f', color: cat?.color || '#666' }} onClick={() => setEditingTx(tx.id)}>
                      {cat?.icon} {cat?.name || 'Non catégorisé'}
                    </button>
                  )}
                </div>
                <div className="td td-acc">{acc?.name || '—'}</div>
                <div className={`td td-amount right ${tx.amount >= 0 ? 'positive' : ''}`}>{fmt(tx.amount, { sign: true })}</div>
                <div className="td td-actions">
                  <button className="icon-btn-sm" onClick={() => deleteTransaction(tx.id)}><Trash2 size={13}/></button>
                </div>
              </div>
            );
          })}
        </div>
        {filtered.length > 200 && <div className="tx-more">+ {filtered.length - 200} transactions (affinez les filtres)</div>}
      </div>
    </div>
  );
}

// ============================================================================
// ANALYSIS
// ============================================================================
function Analysis({ transactions, categories, recurringIds, recurringGroups, monthlyEvolution, accounts, memberShare, fmt }) {
  const [selectedCat, setSelectedCat] = useState('all');

  const catTimeData = useMemo(() => {
    const data = {};
    transactions.forEach(t => {
      if (t.amount >= 0) return;
      if (selectedCat !== 'all' && t.categoryId !== selectedCat) return;
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const m = monthKey(t.date);
      data[m] = (data[m] || 0) + Math.abs(t.amount) * share;
    });
    return Object.entries(data).map(([month, amount]) => ({ month, amount })).sort((a, b) => a.month.localeCompare(b.month));
  }, [transactions, selectedCat, accounts, memberShare]);

  const topMerchants = useMemo(() => {
    const m = {};
    transactions.forEach(t => {
      if (t.amount >= 0) return;
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const key = (t.label || '').slice(0, 30);
      if (!m[key]) m[key] = { label: key, total: 0, count: 0 };
      m[key].total += Math.abs(t.amount) * share;
      m[key].count += 1;
    });
    return Object.values(m).sort((a, b) => b.total - a.total).slice(0, 10);
  }, [transactions, accounts, memberShare]);

  return (
    <div className="analysis-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Analyse approfondie</h1>
          <p className="page-subtitle">Comprenez vos habitudes financières</p>
        </div>
      </div>

      <section className="card">
        <div className="card-header"><h3>Évolution mensuelle complète</h3></div>
        {monthlyEvolution.length > 0 ? (
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyEvolution.slice(-12)}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
              <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--text-tertiary)" fontSize={11}/>
              <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11}/>
              <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
              <Legend wrapperStyle={{ fontSize: 12 }}/>
              <Bar dataKey="income" name="Revenus" fill="#10b981" radius={[4, 4, 0, 0]}/>
              <Bar dataKey="expenses" name="Dépenses" fill="#ef4444" radius={[4, 4, 0, 0]}/>
            </BarChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty">Pas de données</div>}
      </section>

      <div className="dashboard-grid">
        <section className="card">
          <div className="card-header"><h3>Top marchands</h3></div>
          <div className="merchants-list">
            {topMerchants.map((m, idx) => (
              <div key={idx} className="merchant-row">
                <div className="merchant-rank">{String(idx + 1).padStart(2, '0')}</div>
                <div className="merchant-info">
                  <div className="merchant-name">{m.label || 'Sans libellé'}</div>
                  <div className="merchant-meta">{m.count} transaction{m.count > 1 ? 's' : ''}</div>
                </div>
                <div className="merchant-total">{fmt(m.total)}</div>
              </div>
            ))}
          </div>
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Évolution par catégorie</h3>
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
              <option value="all">Toutes dépenses</option>
              {categories.filter(c => c.type === 'expense').map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
            </select>
          </div>
          {catTimeData.length > 0 ? (
            <ResponsiveContainer width="100%" height={220}>
              <LineChart data={catTimeData}>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
                <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--text-tertiary)" fontSize={11}/>
                <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11}/>
                <Tooltip formatter={(v) => formatCurrency(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                <Line type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2.5} dot={{ r: 3 }}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty">Aucune donnée</div>}
        </section>
      </div>
    </div>
  );
}

// ============================================================================
// SETTINGS
// ============================================================================
function SettingsView({ members, accounts, accountBalances, saveMember, deleteMember, deleteAccount, achievements, exportData, importData, resetAllData, categories = [], fmt }) {
  const [editingMember, setEditingMember] = useState(null);
  const COLORS = MEMBER_PALETTE;

  return (
    <div className="settings-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Réglages</h1>
          <p className="page-subtitle">Gérez les membres, comptes, et vos données</p>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h3><Users size={16}/> Membres du foyer</h3>
          <button className="secondary-btn" onClick={() => setEditingMember({ id: null, name: '', role: 'adult', color: COLORS[members.length % COLORS.length] })}><Plus size={14}/> Ajouter</button>
        </div>
        <div className="member-list">
          {members.map(m => (
            <div key={m.id} className="member-card">
              <span className="member-avatar large" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
              <div className="member-card-info">
                <div className="member-card-name">{m.name}</div>
                <div className="member-card-role">{m.role === 'adult' ? 'Adulte' : 'Enfant'}</div>
              </div>
              <button className="icon-btn-sm" onClick={() => setEditingMember(m)}><Edit3 size={13}/></button>
              <button className="icon-btn-sm" onClick={() => deleteMember(m.id)}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3><Wallet size={16}/> Comptes bancaires</h3></div>
        <div className="member-list">
          {accounts.length === 0 && <div className="empty-mini"><Wallet size={24}/><p>Aucun compte. Importez un CSV.</p></div>}
          {accounts.map(a => {
            const owners = (a.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');
            return (
              <div key={a.id} className="member-card">
                <span className="member-avatar large" style={{ background: '#3b82f6' }}>{a.bank?.charAt(0) || '?'}</span>
                <div className="member-card-info">
                  <div className="member-card-name">{a.name}</div>
                  <div className="member-card-role">{a.bank} · {owners} · {fmt(accountBalances[a.id] || 0)}</div>
                </div>
                <button className="icon-btn-sm" onClick={() => deleteAccount(a.id)}><Trash2 size={13}/></button>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3><Award size={16}/> Vos succès</h3><span className="card-meta">{achievements.length}/{ACHIEVEMENT_DEFS.length} débloqués</span></div>
        <div className="achievements-grid full">
          {ACHIEVEMENT_DEFS.map(a => {
            const unlocked = achievements.includes(a.id);
            return (
              <div key={a.id} className={`achievement-badge ${unlocked ? 'unlocked' : 'locked'}`}>
                <span className="ach-icon">{unlocked ? a.icon : '🔒'}</span>
                <div className="ach-info">
                  <span className="ach-name">{a.name}</span>
                  <span className="ach-desc">{a.description}</span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3>Données</h3></div>
        <div className="settings-buttons">
          <button className="secondary-btn" onClick={exportData}><Download size={14}/> Exporter (backup JSON)</button>
          <label className="secondary-btn" style={{ cursor: 'pointer' }}>
            <Upload size={14}/> Importer un backup
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }}/>
          </label>
          <button className="danger-btn" onClick={resetAllData}><Trash2 size={14}/> Réinitialiser tout</button>
        </div>
        <div className="settings-info">
          <Lightbulb size={14}/>
          <span><strong>Migration future :</strong> exportez régulièrement votre backup. Quand vous passerez en self-hosted Docker, ce fichier permettra une migration sans perte.</span>
        </div>
      </section>

      <CustomRulesSection categories={categories} />

      {editingMember && <MemberEditor member={editingMember} onSave={(m) => { saveMember(m); setEditingMember(null); }} onCancel={() => setEditingMember(null)}/>}
    </div>
  );
}

/**
 * Custom regex rules manager — adds to / overrides the built-in pattern
 * library so the user can teach the categorizer about merchants Wealthly
 * doesn't know yet (boulangerie locale, médecin habituel, abonnement de
 * niche, etc.).
 *
 * Backend exposes /rules with list / create / delete (rules.create takes
 * { pattern: string, categoryId: string }).
 */
function CustomRulesSection({ categories }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPattern, setNewPattern] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.rules.list();
      setRules(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type !== 'income'),
    [categories]
  );

  const onAdd = async (e) => {
    e.preventDefault();
    if (!newPattern.trim() || !newCategory) return;
    try {
      setSubmitting(true);
      // Validate the regex client-side first — fail fast with a clear message.
      try { new RegExp(newPattern, 'i'); } catch (re) {
        setError(`Regex invalide : ${re.message}`);
        setSubmitting(false);
        return;
      }
      await api.rules.create({ pattern: newPattern.trim(), category_slug: newCategory });
      setNewPattern('');
      setNewCategory('');
      setError(null);
      await refresh();
    } catch (err) {
      setError(err.message || "Impossible d'ajouter la règle");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Supprimer cette règle ?')) return;
    try {
      await api.rules.delete(id);
      await refresh();
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <h3><Sparkles size={16}/> Règles de catégorisation</h3>
        <span className="card-meta">{rules.length} règle{rules.length > 1 ? 's' : ''}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 14px', lineHeight: 1.5 }}>
        Apprenez au catégoriseur à reconnaître vos marchands habituels. Chaque règle est une expression régulière (insensible à la casse) testée sur le libellé de chaque transaction. Les règles personnalisées priment sur les règles par défaut.
      </p>

      {/* Add form */}
      <form onSubmit={onAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder="ex : boulangerie martin|martin patisser"
          style={{ flex: '2 1 220px', minWidth: 0 }}
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{ flex: '1 1 160px', minWidth: 0 }}
        >
          <option value="">Catégorie cible…</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="primary-btn"
          disabled={submitting || !newPattern.trim() || !newCategory}
        >
          <Plus size={14}/> Ajouter
        </button>
      </form>

      {error && (
        <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
          <AlertCircle size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }}/>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-mini"><Activity size={20}/><p>Chargement…</p></div>
      ) : rules.length === 0 ? (
        <div className="empty-mini">
          <Sparkles size={22}/>
          <p>Aucune règle personnalisée. Ajoute-en une ci-dessus pour qu'un libellé spécifique aille toujours dans la bonne catégorie.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rules.map((r) => {
            const slug = r.category_slug || r.categoryId;
            const cat = categories.find((c) => c.id === slug);
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: 'JetBrains Mono, ui-monospace, Menlo, monospace',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.pattern}
                >
                  /{r.pattern}/i
                </code>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: (cat?.color || '#999') + '22',
                    color: cat?.color || 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat?.icon} {cat?.name || slug}
                </span>
                <button className="icon-btn-sm" onClick={() => onDelete(r.id)} title="Supprimer">
                  <Trash2 size={13}/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="settings-info" style={{ marginTop: 14 }}>
        <Lightbulb size={14}/>
        <span>
          <strong>Astuce :</strong> sépare plusieurs marchands avec le pipe <code>|</code>. Exemple : <code>amazon|amzn|amz</code> couvre les 3 variantes. Les règles s'appliquent aux nouvelles transactions importées, et au bouton "Recatégoriser" sur chaque transaction.
        </span>
      </div>
    </section>
  );
}

function MemberEditor({ member, onSave, onCancel }) {
  const [draft, setDraft] = useState(member);
  const COLORS = MEMBER_PALETTE;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{member.id ? 'Modifier le membre' : 'Nouveau membre'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label><span>Prénom</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}/></label>
          <label><span>Rôle</span>
            <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
              <option value="adult">Adulte</option>
              <option value="child">Enfant</option>
            </select>
          </label>
          <label><span>Couleur</span>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} className={`color-dot ${draft.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })}/>
              ))}
            </div>
          </label>
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <button className="primary-btn" onClick={() => { if (draft.name) onSave(draft); }}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// IMPORT FLOW
// ============================================================================
function ImportFlow({ step, parsedData, mapping, setMapping, account, setAccount, preview, categories, members, existingAccounts, knownMappings, detectedBank, handleFileUpload, proceedToAccountStep, proceedToPreview, confirmImport, cancelImport, setStep, fmt }) {
  if (step === 'upload') {
    return (
      <div className="import-flow">
        <div className="import-header">
          <h2>Importer un relevé CSV</h2>
          <p>Glissez votre fichier ou cliquez pour le sélectionner</p>
        </div>
        <label className="upload-zone">
          <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} style={{ display: 'none' }}/>
          <div className="upload-icon"><Upload size={36}/></div>
          <span className="upload-main">Choisir un fichier CSV</span>
          <span className="upload-sub">Détection auto Revolut, Crédit Agricole, Boursorama et autres</span>
        </label>
        <div className="import-tips">
          <Lightbulb size={14}/>
          <span><strong>Crédit Agricole :</strong> exportez en PDF puis convertissez via OFXpress.fr ou BankStatementLab. Le CSV natif est instable.</span>
        </div>
      </div>
    );
  }
  if (step === 'mapping') {
    return (
      <div className="import-flow">
        <div className="import-header">
          <div className="import-progress">
            <span className="step active"><div className="step-num">1</div>Colonnes</span>
            <span className="step"><div className="step-num">2</div>Compte</span>
            <span className="step"><div className="step-num">3</div>Aperçu</span>
          </div>
          <h2>Vérifiez le mapping</h2>
          <p>{parsedData?.rows.length} lignes détectées · délimiteur "{parsedData?.delimiter === '\t' ? 'TAB' : parsedData?.delimiter}"</p>
          {detectedBank && (
            <div className="detection-badge">
              <Sparkles size={14}/> Format <strong>{detectedBank.profile.name}</strong> détecté — mapping pré-rempli
            </div>
          )}
        </div>
        <div className="mapping-grid">
          <MappingField label="Date *" required value={mapping.date} onChange={(v) => setMapping({ ...mapping, date: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Libellé" value={mapping.label} onChange={(v) => setMapping({ ...mapping, label: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Montant signé" value={mapping.amount} onChange={(v) => setMapping({ ...mapping, amount: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Débit séparé" value={mapping.debit} onChange={(v) => setMapping({ ...mapping, debit: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Crédit séparé" value={mapping.credit} onChange={(v) => setMapping({ ...mapping, credit: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Solde (optionnel)" value={mapping.balance} onChange={(v) => setMapping({ ...mapping, balance: v })} headers={parsedData?.headers || []}/>
        </div>
        <div className="csv-preview">
          <strong>Aperçu :</strong>
          <table>
            <thead><tr>{parsedData?.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{parsedData?.rows.slice(0, 4).map((r, i) => <tr key={i}>{parsedData.headers.map(h => <td key={h}>{r[h]}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="flow-actions">
          <button className="secondary-btn" onClick={cancelImport}>Annuler</button>
          <button className="primary-btn" onClick={proceedToAccountStep}>Suivant <ChevronRight size={14}/></button>
        </div>
      </div>
    );
  }
  if (step === 'account') {
    const toggleMember = (mid) => {
      const ids = account.memberIds || [];
      setAccount({ ...account, memberIds: ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid] });
    };
    return (
      <div className="import-flow">
        <div className="import-header">
          <div className="import-progress">
            <span className="step done"><div className="step-num"><Check size={11}/></div>Colonnes</span>
            <span className="step active"><div className="step-num">2</div>Compte</span>
            <span className="step"><div className="step-num">3</div>Aperçu</span>
          </div>
          <h2>À quel compte appartiennent ces transactions ?</h2>
        </div>
        <div className="account-form">
          <label><span>Banque</span>
            <select value={account.bank} onChange={(e) => setAccount({ ...account, bank: e.target.value })}>
              <option value="">Choisir…</option>
              <option>Crédit Agricole</option><option>Revolut</option><option>Boursorama</option>
              <option>BNP Paribas</option><option>Société Générale</option><option>LCL</option>
              <option>Crédit Mutuel</option><option>Caisse d'Épargne</option><option>La Banque Postale</option>
              <option>N26</option><option>HSBC</option><option>Fortuneo</option><option>Hello bank!</option><option>Autre</option>
            </select>
          </label>
          <label><span>Nom du compte</span>
            <input value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="ex: Compte courant principal" list="known-accounts"/>
            <datalist id="known-accounts">{existingAccounts.map(a => <option key={a.id} value={a.name}/>)}</datalist>
          </label>
          <label><span>Type</span>
            <select value={account.type} onChange={(e) => setAccount({ ...account, type: e.target.value })}>
              <option value="checking">Compte courant</option>
              <option value="savings">Livret / épargne</option>
              <option value="pea">PEA / Bourse</option>
              <option value="credit">Carte de crédit</option>
            </select>
          </label>
          <label><span>Propriétaires <span className="hint">(plusieurs = compte joint)</span></span>
            <div className="member-checks">
              {members.map(m => (
                <label key={m.id} className={`member-check ${(account.memberIds || []).includes(m.id) ? 'active' : ''}`} style={{ borderColor: (account.memberIds || []).includes(m.id) ? m.color : undefined }}>
                  <input type="checkbox" checked={(account.memberIds || []).includes(m.id)} onChange={() => toggleMember(m.id)}/>
                  <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          </label>
          <label><span>Solde initial (optionnel)</span>
            <input type="number" value={account.initialBalance} onChange={(e) => setAccount({ ...account, initialBalance: e.target.value })} placeholder="0"/>
          </label>
        </div>
        <div className="flow-actions">
          <button className="secondary-btn" onClick={() => setStep('mapping')}>Retour</button>
          <button className="primary-btn" onClick={proceedToPreview}>Aperçu <ChevronRight size={14}/></button>
        </div>
      </div>
    );
  }
  if (step === 'preview') {
    const total = preview.reduce((s, t) => s + t.amount, 0);
    return (
      <div className="import-flow">
        <div className="import-header">
          <div className="import-progress">
            <span className="step done"><div className="step-num"><Check size={11}/></div>Colonnes</span>
            <span className="step done"><div className="step-num"><Check size={11}/></div>Compte</span>
            <span className="step active"><div className="step-num">3</div>Aperçu</span>
          </div>
          <h2>Vérification avant import</h2>
          <p><strong>{preview.length}</strong> transactions vers <strong>{account.name}</strong> · Net : <strong>{fmt(total, { sign: true })}</strong></p>
        </div>
        <div className="preview-list">
          {preview.slice(0, 30).map(tx => {
            const cat = categories.find(c => c.id === tx.categoryId);
            return (
              <div key={tx.id} className="preview-row">
                <span className="prev-date">{formatDate(tx.date)}</span>
                <span className="prev-label">
                  {tx.label}
                  {tx.aiCategorized && <span className="ai-badge" title="Catégorisé par IA">✨</span>}
                </span>
                <span className="prev-cat" style={{ background: (cat?.color || '#999') + '22', color: cat?.color }}>{cat?.icon} {cat?.name}</span>
                <span className={`prev-amount ${tx.amount >= 0 ? 'positive' : ''}`}>{fmt(tx.amount, { sign: true })}</span>
              </div>
            );
          })}
          {preview.length > 30 && <div className="preview-more">+ {preview.length - 30} autres</div>}
        </div>
        <div className="flow-actions">
          <button className="secondary-btn" onClick={() => setStep('account')}>Retour</button>
          <button className="primary-btn" onClick={confirmImport}><Check size={14}/> Confirmer l'import</button>
        </div>
      </div>
    );
  }
  return null;
}

function MappingField({ label, value, onChange, headers, required }) {
  return (
    <label className={`mapping-field ${required ? 'required' : ''}`}>
      <span className="mapping-label">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— Aucune —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </label>
  );
}

// ============================================================================
// STYLES
// ============================================================================
function Styles({ theme }) {
  const dark = theme === 'dark';
  const css = `
:root {
  /* Surfaces — warm near-black */
  --bg-page: ${dark ? '#0c0d10' : '#faf8f3'};
  --bg-card: ${dark ? '#15171c' : '#ffffff'};
  --bg-card-hover: ${dark ? '#1b1d24' : '#faf8f3'};
  --bg-subtle: ${dark ? '#11131a' : '#f5f1e6'};
  /* Text — cream-tinted off-white in dark, near-black in light */
  --text-primary: ${dark ? '#ebe8e3' : '#1a1812'};
  --text-secondary: ${dark ? '#b5b2ab' : '#4a4740'};
  --text-tertiary: ${dark ? '#7a7872' : '#8a8579'};
  /* Borders */
  --border: ${dark ? '#232730' : '#e8e3d6'};
  --border-light: ${dark ? '#1c1f27' : '#f1ede2'};
  --border-strong: ${dark ? '#2e333f' : '#cfc8b6'};
  /* Primary — muted antique gold */
  --primary: ${dark ? '#c5a572' : '#a08555'};
  --primary-hover: ${dark ? '#b8965f' : '#8a7146'};
  --primary-soft: ${dark ? 'rgba(197, 165, 114, 0.14)' : 'rgba(160, 133, 85, 0.1)'};
  --primary-text: ${dark ? '#e0c896' : '#6a5436'};
  /* Success — muted sage */
  --success: ${dark ? '#88a978' : '#6e8c61'};
  --success-soft: ${dark ? 'rgba(136, 169, 120, 0.14)' : 'rgba(110, 140, 97, 0.1)'};
  --success-text: ${dark ? '#a5c298' : '#4a6242'};
  /* Danger — muted terracotta */
  --danger: ${dark ? '#c47158' : '#ad5f48'};
  --danger-soft: ${dark ? 'rgba(196, 113, 88, 0.14)' : 'rgba(173, 95, 72, 0.1)'};
  --danger-text: ${dark ? '#e0917a' : '#8a4632'};
  /* Warning */
  --warning: ${dark ? '#d4a554' : '#b5872c'};
  --warning-soft: ${dark ? 'rgba(212, 165, 84, 0.14)' : 'rgba(181, 135, 44, 0.1)'};
  --warning-text: ${dark ? '#e8be7a' : '#806020'};
  /* Purple — used for joint accounts */
  --purple: ${dark ? '#9d8bb5' : '#7d6c95'};
  --purple-soft: ${dark ? 'rgba(157, 139, 181, 0.14)' : 'rgba(125, 108, 149, 0.1)'};
  /* Info — muted slate-blue (used by 50/30/20 needs segment, etc.) */
  --info: ${dark ? '#7a8aa8' : '#5b6a85'};
  --info-soft: ${dark ? 'rgba(122, 138, 168, 0.14)' : 'rgba(91, 106, 133, 0.1)'};
  /* Shadows */
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,${dark ? '0.4' : '0.04'});
  --shadow-md: 0 4px 12px -1px rgba(0,0,0,${dark ? '0.32' : '0.06'});
  --shadow-lg: 0 16px 40px -10px rgba(0,0,0,${dark ? '0.45' : '0.08'});
  --shadow-xl: 0 24px 60px -15px rgba(0,0,0,${dark ? '0.55' : '0.1'});
  /* Gradients — sober, no startup-y blue/purple */
  --gradient-hero: linear-gradient(135deg, ${dark ? '#c5a572' : '#a08555'} 0%, ${dark ? '#a08555' : '#7a6440'} 100%);
  --gradient-success: linear-gradient(135deg, ${dark ? '#88a978' : '#6e8c61'} 0%, ${dark ? '#6e8c61' : '#516948'} 100%);
}
* { box-sizing: border-box; }
.app { font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: var(--bg-page); color: var(--text-primary); min-height: 100vh; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased; }

.loading-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: var(--bg-page); color: var(--text-secondary); }
.spinner { width: 32px; height: 32px; border: 2.5px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }

/* DEMO MODE banner */
.demo-banner { display: flex; align-items: center; gap: 12px; padding: 9px 18px; background: var(--primary-soft); border-bottom: 1px solid var(--border); font-size: 12px; color: var(--text-secondary); flex-wrap: wrap; }
.demo-banner-pill { display: inline-flex; align-items: center; padding: 2px 8px; background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; font-size: 10px; font-weight: 600; letter-spacing: 0.12em; border-radius: 4px; }
.demo-banner-text { flex: 1; min-width: 0; }
.demo-banner-action { padding: 5px 12px; background: transparent; border: 1px solid var(--border-strong); border-radius: 4px; color: var(--text-primary); font-size: 11px; font-weight: 500; cursor: pointer; font-family: inherit; transition: background .15s, border-color .15s; }
.demo-banner-action:hover { background: var(--bg-card); border-color: var(--text-tertiary); }
@media (max-width: 640px) { .demo-banner { padding: 8px 14px; font-size: 11px; } .demo-banner-text { font-size: 11px; } }
@keyframes spin { to { transform: rotate(360deg); } }

/* HEADER */
.app-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); background: ${dark ? 'rgba(20, 24, 33, 0.85)' : 'rgba(255, 255, 255, 0.85)'}; gap: 12px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.brand:hover { opacity: 0.85; }
.brand-mark { width: 38px; height: 38px; border-radius: 6px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.35)' : 'rgba(160, 133, 85, 0.3)'}; display: flex; align-items: center; justify-content: center; color: var(--primary); box-shadow: none; }
.brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.brand-name { font-size: 17px; font-weight: 700; letter-spacing: -0.025em; }
.brand-tagline { font-size: 10px; color: var(--text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 1px; }
.main-nav { display: flex; gap: 2px; background: var(--bg-subtle); padding: 4px; border-radius: 12px; overflow-x: auto; }
.main-nav button { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
.main-nav button:hover { background: var(--bg-card); color: var(--text-primary); }
.main-nav button.active { background: var(--bg-card); color: var(--primary); box-shadow: var(--shadow-sm); }
.nav-alert-dot { display: inline-flex; align-items: center; justify-content: center; min-width: 16px; height: 16px; padding: 0 5px; margin-left: 4px; border-radius: 8px; background: var(--danger); color: white; font-size: 10px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; }
.header-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--bg-subtle); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.icon-btn-sm { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: transparent; border: 1px solid transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s; }
.icon-btn-sm:hover { background: var(--bg-subtle); color: var(--text-primary); }

.primary-btn, .primary-btn-large, .secondary-btn, .danger-btn, .danger-btn-sm { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; transition: background 0.15s, border-color 0.15s, color 0.15s; border: 1px solid transparent; font-family: inherit; letter-spacing: 0.01em; }
.primary-btn { background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; }
.primary-btn:hover { background: var(--primary-hover); }
.primary-btn:disabled { opacity: 0.45; cursor: not-allowed; }
.primary-btn-large { background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; padding: 11px 22px; font-size: 14px; }
.primary-btn-large:hover { background: var(--primary-hover); }
.secondary-btn { background: transparent; border: 1px solid var(--border-strong); color: var(--text-primary); }
.secondary-btn:hover { background: var(--bg-subtle); border-color: var(--text-tertiary); }
.danger-btn { background: var(--danger-soft); color: var(--danger-text); border: 1px solid transparent; }
.danger-btn:hover { background: var(--danger); color: white; }
.danger-btn-sm { padding: 5px 9px; background: var(--danger-soft); color: var(--danger-text); font-size: 12px; }
.link-btn { background: transparent; border: none; color: var(--primary); font-size: 12px; font-weight: 500; cursor: pointer; display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; border-radius: 4px; }
.link-btn:hover { background: var(--primary-soft); }

.member-bar { padding: 12px 24px 0; background: var(--bg-page); border-bottom: 1px solid var(--border); }
.member-tabs { display: flex; gap: 8px; overflow-x: auto; scrollbar-width: none; }
.member-tabs::-webkit-scrollbar { display: none; }
.member-tab { display: inline-flex; align-items: center; gap: 8px; padding: 8px 14px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 22px; font-size: 13px; font-weight: 600; color: var(--text-secondary); cursor: pointer; transition: all 0.15s; flex-shrink: 0; font-family: inherit; }
.member-tab:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.member-tab.active { color: white; box-shadow: var(--shadow-md); }
.member-avatar { width: 22px; height: 22px; border-radius: 50%; color: white; display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.member-avatar.large { width: 36px; height: 36px; font-size: 14px; }
.role-badge { font-size: 9px; font-weight: 700; padding: 2px 6px; background: rgba(255,255,255,0.25); border-radius: 4px; text-transform: uppercase; letter-spacing: 0.04em; }
.member-context { padding: 10px 0; font-size: 12px; color: var(--text-tertiary); }
.member-context strong { color: var(--text-secondary); }

.content { padding: 28px 24px 60px; max-width: 1280px; margin: 0 auto; min-height: calc(100vh - 140px); }
.page-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 24px; flex-wrap: wrap; }
.page-title { font-size: 28px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
.page-subtitle { font-size: 13px; color: var(--text-tertiary); margin: 0; }

input, select, textarea { font-family: inherit; font-size: 13px; padding: 9px 12px; border-radius: 6px; border: 1px solid var(--border); background: ${dark ? 'var(--bg-subtle)' : 'var(--bg-card)'}; color: var(--text-primary); transition: border-color 0.15s, box-shadow 0.15s, background 0.15s; letter-spacing: -0.01em; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px var(--primary-soft); }
label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-help { font-size: 11px; color: var(--text-tertiary); margin-top: -4px; }
.hint { font-weight: 400; color: var(--text-tertiary); }

/* ONBOARDING */
.onboarding { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-page); padding: 32px 16px; color: var(--text-primary); position: relative; overflow: hidden; }
.onboarding-bg-mesh { position: absolute; inset: 0; background: radial-gradient(circle at 15% 20%, ${dark ? 'rgba(197, 165, 114, 0.08)' : 'rgba(160, 133, 85, 0.06)'}, transparent 50%), radial-gradient(circle at 85% 80%, ${dark ? 'rgba(197, 165, 114, 0.04)' : 'rgba(160, 133, 85, 0.03)'}, transparent 50%); pointer-events: none; }
.onboarding-card { background: var(--bg-card); border-radius: 14px; padding: 36px; max-width: 680px; width: 100%; box-shadow: var(--shadow-lg); border: 1px solid var(--border); position: relative; z-index: 1; }
.onboarding-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
.progress-step { display: flex; align-items: center; gap: 8px; color: var(--text-tertiary); font-size: 12px; font-weight: 600; }
.progress-step.active { color: var(--primary); }
.progress-step.done { color: var(--success); }
.progress-dot { width: 24px; height: 24px; border-radius: 50%; background: var(--bg-subtle); border: 1px solid var(--border-strong); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 600; flex-shrink: 0; }
.progress-step.active .progress-dot { background: var(--primary); color: ${dark ? '#0c0d10' : '#ffffff'}; border-color: var(--primary); }
.progress-step.done .progress-dot { background: var(--primary-soft); color: var(--primary); border-color: var(--primary); }
.progress-line { flex: 1; height: 2px; background: var(--border); border-radius: 1px; }
.onboarding-step-content h1 { font-size: 26px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.025em; }
.onboarding-step-content h2 { font-size: 22px; font-weight: 600; margin: 0 0 6px; letter-spacing: -0.02em; }
.onboarding-lead { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; line-height: 1.6; }
.onboarding-hero { text-align: center; margin-bottom: 32px; }
.ob-mark-large { width: 64px; height: 64px; border-radius: 8px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.32)' : 'rgba(160, 133, 85, 0.28)'}; display: inline-flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 20px; }
.onboarding-features-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 28px; }
.ob-feature-card { display: flex; gap: 12px; padding: 16px; background: var(--bg-subtle); border-radius: 14px; border: 1px solid var(--border-light); transition: all 0.2s; }
.ob-feature-card:hover { transform: translateY(-2px); box-shadow: var(--shadow-md); }
.ob-feature-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ob-feature-text { display: flex; flex-direction: column; gap: 2px; }
.ob-feature-text strong { font-size: 13px; }
.ob-feature-text span { font-size: 12px; color: var(--text-tertiary); line-height: 1.4; font-weight: 400; }
.member-preview-list { display: flex; flex-direction: column; gap: 8px; margin-bottom: 16px; }
.member-preview { display: flex; align-items: center; gap: 12px; padding: 12px 14px; background: var(--bg-subtle); border-radius: 12px; border: 1px solid var(--border); }
.member-preview-info { flex: 1; }
.member-preview-name { font-size: 14px; font-weight: 600; }
.member-preview-role { font-size: 11px; color: var(--text-tertiary); }
.add-member-form { display: flex; gap: 8px; margin-bottom: 16px; }
.add-member-form input { flex: 1; }
.add-member-form select { width: 110px; }
.ob-tip { display: flex; gap: 10px; padding: 12px 14px; background: var(--warning-soft); color: var(--warning-text); border-radius: 10px; font-size: 12px; line-height: 1.5; margin-bottom: 24px; }
.ob-tip svg { flex-shrink: 0; margin-top: 2px; }
.ready-icon { width: 56px; height: 56px; border-radius: 8px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.32)' : 'rgba(160, 133, 85, 0.28)'}; display: inline-flex; align-items: center; justify-content: center; color: var(--primary); margin-bottom: 18px; }
.onboarding-summary { padding: 20px; background: var(--bg-subtle); border-radius: 14px; margin-bottom: 20px; }
.summary-stat { text-align: center; margin-bottom: 16px; }
.summary-num { font-size: 36px; font-weight: 800; color: var(--primary); line-height: 1; }
.summary-label { font-size: 12px; color: var(--text-tertiary); margin-top: 4px; }
.summary-list { display: flex; flex-direction: column; gap: 6px; padding-top: 16px; border-top: 1px solid var(--border); }
.summary-member { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.dimmed { color: var(--text-tertiary); }
.ob-next-steps { background: var(--primary-soft); padding: 16px; border-radius: 12px; margin-bottom: 24px; font-size: 13px; }
.ob-next-steps strong { color: var(--primary-text); display: block; margin-bottom: 12px; }
.next-step-item { display: flex; align-items: center; gap: 10px; padding: 6px 0; }
.step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--bg-card); color: var(--primary); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.onboarding-actions { display: flex; gap: 12px; justify-content: space-between; }

/* EMPTY */
.empty-state { padding: 60px 20px; text-align: center; max-width: 480px; margin: 0 auto; }
.empty-illustration { margin-bottom: 24px; }
.empty-circle { width: 64px; height: 64px; border-radius: 8px; background: var(--primary-soft); border: 1px solid ${dark ? 'rgba(197, 165, 114, 0.32)' : 'rgba(160, 133, 85, 0.28)'}; display: inline-flex; align-items: center; justify-content: center; color: var(--primary); }
.empty-state h1 { font-size: 28px; font-weight: 700; margin: 0 0 8px; }
.empty-lead { font-size: 14px; color: var(--text-secondary); margin: 0 0 24px; line-height: 1.6; }
.empty-actions { display: flex; gap: 12px; justify-content: center; flex-wrap: wrap; }
.empty-mini { padding: 32px 20px; text-align: center; color: var(--text-tertiary); display: flex; flex-direction: column; align-items: center; gap: 12px; }
.empty-mini p { margin: 0; font-size: 13px; max-width: 320px; line-height: 1.5; }

/* DASHBOARD */
.dashboard { display: flex; flex-direction: column; gap: 24px; }
.dashboard-greeting { display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 12px; padding: 4px 0 8px; }
.dashboard-greeting h1 { font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.025em; }
.streak-badge { display: inline-flex; align-items: center; gap: 5px; padding: 6px 12px; background: var(--warning-soft); color: var(--warning-text); border-radius: 20px; font-size: 12px; font-weight: 700; }

/* HERO KPIs — Finary/Bunq style: 4 airy cards in a row */
.hero-kpis { display: grid; grid-template-columns: 1.6fr 1fr 1fr 1fr; gap: 14px; }
@media (max-width: 1000px) { .hero-kpis { grid-template-columns: 1fr 1fr; } }
@media (max-width: 580px) { .hero-kpis { grid-template-columns: 1fr; } }

.kpi-card { position: relative; padding: 22px; border-radius: 12px; background: var(--bg-card); border: 1px solid var(--border); overflow: hidden; display: flex; flex-direction: column; gap: 6px; }
.kpi-card-label { font-size: 11px; color: var(--text-tertiary); font-weight: 500; letter-spacing: 0.08em; text-transform: uppercase; }
.kpi-card-value { font-size: 28px; font-weight: 600; line-height: 1.1; letter-spacing: -0.025em; font-variant-numeric: tabular-nums; margin: 6px 0 4px; color: var(--text-primary); }
.kpi-card-sub { display: flex; flex-wrap: wrap; gap: 14px; margin-top: 8px; }
.kpi-card-sub-item { display: inline-flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); font-weight: 400; font-variant-numeric: tabular-nums; }
.kpi-dot { width: 6px; height: 6px; border-radius: 50%; flex-shrink: 0; }
.kpi-card-icon { position: absolute; top: 20px; right: 20px; width: 30px; height: 30px; border-radius: 6px; display: flex; align-items: center; justify-content: center; }
.kpi-card-icon--income { background: var(--success-soft); color: var(--success-text); }
.kpi-card-icon--expense { background: var(--danger-soft); color: var(--danger-text); }

/* Primary card: subtle gold accent rail on the left */
.kpi-card--primary { background: var(--bg-card); }
.kpi-card--primary::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 2px; background: var(--primary); }
.kpi-card--primary .kpi-card-value { font-size: 36px; }

/* Net card accent colors */
.kpi-card--positive .kpi-card-value { color: var(--success); }
.kpi-card--positive .kpi-card-icon { background: var(--success-soft); color: var(--success-text); }
.kpi-card--negative .kpi-card-value { color: var(--danger); }
.kpi-card--negative .kpi-card-icon { background: var(--danger-soft); color: var(--danger-text); }

/* CARDS */
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; padding: 24px; }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 18px; flex-wrap: wrap; }
.card-header h3 { font-size: 13px; font-weight: 600; margin: 0; display: flex; align-items: center; gap: 6px; letter-spacing: 0.01em; color: var(--text-primary); }
.card-meta { font-size: 11px; color: var(--text-tertiary); font-weight: 400; }
.chart-card { padding: 22px 16px 16px 8px; }
.chart-empty { padding: 60px 20px; text-align: center; color: var(--text-tertiary); display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 13px; }
.alert-card { border-color: var(--warning); border-left: 2px solid var(--warning); background: ${dark ? 'rgba(212, 165, 84, 0.04)' : 'rgba(181, 135, 44, 0.04)'}; }
.anomalies-list { display: flex; flex-direction: column; gap: 8px; }
.anomaly-item { display: flex; align-items: center; gap: 12px; padding: 10px 12px; background: var(--bg-card); border-radius: 10px; }
.anomaly-icon { width: 32px; height: 32px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.anomaly-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; font-size: 13px; }
.anomaly-text span { font-size: 12px; color: var(--text-tertiary); font-weight: 400; }
.anomaly-ratio { font-size: 14px; font-weight: 700; color: var(--danger); padding: 4px 8px; background: var(--danger-soft); border-radius: 8px; }

.dashboard-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(340px, 1fr)); gap: 16px; }
.composition-row { display: flex; align-items: center; }
.legend-list { display: flex; flex-direction: column; gap: 12px; flex: 1; padding-left: 8px; }
.legend-item { display: flex; align-items: center; gap: 10px; }
.legend-dot { width: 12px; height: 12px; border-radius: 4px; flex-shrink: 0; }
.legend-name { font-size: 12px; color: var(--text-tertiary); }
.legend-value { font-size: 14px; font-weight: 600; font-variant-numeric: tabular-nums; }

.cat-breakdown { display: flex; flex-direction: column; gap: 12px; }
.cat-row { display: flex; flex-direction: column; gap: 6px; }
.cat-info { display: flex; align-items: center; gap: 10px; }
.cat-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.cat-name { flex: 1; font-size: 13px; font-weight: 500; }
.cat-amounts { display: flex; align-items: center; gap: 8px; }
.cat-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.cat-change { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
.cat-change.up { background: var(--danger-soft); color: var(--danger-text); }
.cat-change.down { background: var(--success-soft); color: var(--success-text); }
.cat-bar { height: 4px; background: var(--bg-subtle); border-radius: 2px; overflow: hidden; }
.cat-bar-fill { height: 100%; border-radius: 2px; transition: width 0.6s ease; }

.accounts-list, .recent-tx { display: flex; flex-direction: column; gap: 8px; }
.account-row { display: flex; align-items: center; gap: 12px; padding: 10px; border-radius: 10px; transition: background 0.15s; }
.account-row:hover { background: var(--bg-subtle); }
.acc-icon { width: 36px; height: 36px; border-radius: 10px; color: white; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 14px; flex-shrink: 0; }
.acc-info { flex: 1; min-width: 0; }
.acc-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.acc-bank { font-size: 11px; color: var(--text-tertiary); }
.acc-balance { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.acc-balance.negative { color: var(--danger); }

.tx-row-mini { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; transition: background 0.15s; }
.tx-row-mini:hover { background: var(--bg-subtle); }
.tx-cat-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
.tx-mini-info { flex: 1; min-width: 0; }
.tx-mini-label { font-size: 12px; font-weight: 500; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.tx-mini-meta { font-size: 10px; color: var(--text-tertiary); }
.tx-mini-amount { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }
.tx-mini-amount.positive { color: var(--success); }

/* MONTHLY */
.monthly-view { display: flex; flex-direction: column; gap: 20px; }
.monthly-header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; flex-wrap: wrap; }
.monthly-header h1 { font-size: 28px; font-weight: 700; margin: 0 0 4px; letter-spacing: -0.02em; }
.month-selector { padding: 10px 14px; border-radius: 10px; border: 1px solid var(--border); background: var(--bg-card); font-size: 13px; font-weight: 600; cursor: pointer; }
.monthly-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.mk-card { display: flex; align-items: center; gap: 12px; padding: 16px 18px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-sm); }
.mk-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.mk-card.income .mk-icon { background: var(--success-soft); color: var(--success-text); }
.mk-card.fixed .mk-icon { background: var(--purple-soft); color: var(--purple); }
.mk-card.variable .mk-icon { background: var(--warning-soft); color: var(--warning-text); }
.mk-card.net.positive .mk-icon { background: var(--success-soft); color: var(--success-text); }
.mk-card.net.negative .mk-icon { background: var(--danger-soft); color: var(--danger-text); }
.mk-info { flex: 1; min-width: 0; }
.mk-label { font-size: 11px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.mk-value { font-size: 21px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.2; margin-top: 2px; }
.mk-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.mk-card.net.positive .mk-value { color: var(--success); }
.mk-card.net.negative .mk-value { color: var(--danger); }
.mk-card.savings-rate.positive .mk-icon { background: var(--success-soft); color: var(--success-text); }
.mk-card.savings-rate.neutral .mk-icon { background: var(--warning-soft); color: var(--warning-text); }
.mk-card.savings-rate.negative .mk-icon { background: var(--danger-soft); color: var(--danger-text); }
.mk-card.savings-rate.positive .mk-value { color: var(--success); }
.mk-card.savings-rate.neutral .mk-value { color: var(--warning); }
.mk-card.savings-rate.negative .mk-value { color: var(--danger); }

.analyse-section-header { display: flex; align-items: center; gap: 10px; padding: 12px 4px 0; border-top: 1px solid var(--border); margin-top: 8px; }
.analyse-section-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
.analyse-section-header svg { color: var(--text-tertiary); }
.analyse-section-subtitle { font-size: 12px; color: var(--text-tertiary); font-weight: 500; margin-left: auto; }

.projection-card { background: linear-gradient(135deg, var(--bg-card) 0%, var(--primary-soft) 100%); }
.projection-grid { display: grid; grid-template-columns: 1fr 1fr 1fr; gap: 12px; }
.proj-item { padding: 12px; border-radius: 10px; background: var(--bg-card); }
.proj-item.highlight { border: 2px solid var(--primary); }
.proj-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
.proj-value { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; }
.proj-value.positive { color: var(--success); }
.proj-value.negative { color: var(--danger); }
.proj-bar { height: 6px; background: var(--bg-subtle); border-radius: 3px; overflow: hidden; margin-top: 14px; }
.proj-bar-fill { height: 100%; background: var(--gradient-hero); border-radius: 3px; transition: width 0.6s ease; }

.monthly-grid { display: grid; grid-template-columns: 1fr; gap: 16px; }
@media (min-width: 900px) { .monthly-grid { grid-template-columns: 1.2fr 1fr; } }
.recurring-list-detailed { display: flex; flex-direction: column; gap: 8px; }
.recurring-detailed-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 8px; background: var(--bg-subtle); transition: background 0.15s; border: 1px solid var(--border); }
.recurring-detailed-item:hover { background: var(--bg-card-hover); border-color: var(--border-strong); }
.rec-day-badge { display: flex; flex-direction: column; align-items: center; padding: 8px 10px; background: var(--purple-soft); border-radius: 10px; flex-shrink: 0; min-width: 56px; }
.rec-day-num { font-size: 20px; font-weight: 800; color: var(--purple); line-height: 1; }
.rec-day-suffix { font-size: 9px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; margin-top: 2px; }
.rec-detailed-info { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.rec-detailed-label { display: flex; align-items: center; gap: 8px; font-size: 13px; }
.rec-detailed-label strong { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.rec-icon-mini { width: 22px; height: 22px; border-radius: 6px; display: flex; align-items: center; justify-content: center; font-size: 11px; flex-shrink: 0; }
.rec-detailed-meta { font-size: 11px; color: var(--text-tertiary); display: flex; gap: 6px; }
.rec-amount-large { font-size: 16px; font-weight: 800; color: var(--danger); font-variant-numeric: tabular-nums; }
.recurring-more { padding: 12px; text-align: center; font-size: 12px; color: var(--text-tertiary); }

.calendar-strip { display: grid; grid-template-columns: repeat(7, 1fr); gap: 4px; padding: 8px 0; }
.cal-day { position: relative; aspect-ratio: 1; border-radius: 8px; background: var(--bg-subtle); display: flex; flex-direction: column; align-items: center; justify-content: flex-start; padding: 4px; }
.cal-day.has-items { background: var(--primary-soft); }
.cal-day.has-items:hover { background: var(--primary); }
.cal-day.has-items:hover .cal-day-num { color: white; }
.cal-day.has-items:hover .cal-day-dot { background: white; }
.cal-day-num { font-size: 11px; font-weight: 700; color: var(--text-secondary); }
.cal-day-dot { width: 4px; min-height: 4px; max-height: 24px; background: var(--primary); border-radius: 2px; margin-top: 2px; }
.cal-day-tooltip { position: absolute; top: 100%; left: 50%; transform: translateX(-50%); background: var(--text-primary); color: var(--bg-card); padding: 8px 12px; border-radius: 8px; font-size: 11px; white-space: nowrap; opacity: 0; pointer-events: none; transition: opacity 0.15s; z-index: 10; box-shadow: var(--shadow-lg); }
.cal-day:hover .cal-day-tooltip { opacity: 1; }
.cal-tooltip-item { padding: 2px 0; }
.cal-tooltip-more { font-style: italic; opacity: 0.7; padding-top: 4px; border-top: 1px solid rgba(255,255,255,0.2); }
.calendar-legend { font-size: 11px; color: var(--text-tertiary); text-align: center; margin-top: 8px; }

.month-comparison { display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto; }
.comp-row { display: flex; align-items: center; gap: 10px; padding: 8px 10px; border-radius: 8px; }
.comp-row:hover { background: var(--bg-subtle); }
.comp-icon { width: 28px; height: 28px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 13px; flex-shrink: 0; }
.comp-info { flex: 1; min-width: 0; }
.comp-name { font-size: 13px; font-weight: 600; }
.comp-amounts { font-size: 11px; color: var(--text-tertiary); }
.comp-current { font-weight: 700; color: var(--text-primary); margin-right: 6px; font-variant-numeric: tabular-nums; }
.comp-change { display: inline-flex; align-items: center; gap: 3px; padding: 4px 8px; border-radius: 8px; font-size: 11px; font-weight: 700; }
.comp-change.up { background: var(--danger-soft); color: var(--danger-text); }
.comp-change.down { background: var(--success-soft); color: var(--success-text); }
.comp-change.stable { background: var(--bg-subtle); color: var(--text-tertiary); }

/* BUDGETS */
.budgets-view { display: flex; flex-direction: column; gap: 20px; }
.budget-50-30-20 .ratio-display { display: flex; flex-direction: column; gap: 16px; }
.ratio-bar-large { display: flex; height: 44px; border-radius: 8px; overflow: hidden; border: 1px solid var(--border); }
.ratio-segment { display: flex; align-items: center; justify-content: center; transition: flex 0.6s ease; min-width: 0; }
.ratio-segment.needs { background: var(--info); }
.ratio-segment.wants { background: var(--primary); }
.ratio-segment.savings { background: var(--success); }
.ratio-pct { font-size: 14px; font-weight: 600; color: ${dark ? '#0c0d10' : '#ffffff'}; font-variant-numeric: tabular-nums; }
.ratio-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.ratio-card { padding: 16px; border-radius: 8px; background: var(--bg-subtle); border: 1px solid var(--border); border-left-width: 2px; }
.ratio-card.needs { border-left-color: var(--info); }
.ratio-card.wants { border-left-color: var(--primary); }
.ratio-card.savings { border-left-color: var(--success); }
.ratio-card-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.ratio-card-pct { font-size: 24px; font-weight: 600; line-height: 1; font-variant-numeric: tabular-nums; letter-spacing: -0.02em; }
.ratio-card.needs .ratio-card-pct { color: var(--info); }
.ratio-card.wants .ratio-card-pct { color: var(--primary); }
.ratio-card.savings .ratio-card-pct { color: var(--success); }
.ratio-card-target { font-size: 11px; color: var(--text-tertiary); font-weight: 700; }
.ratio-card-name { font-size: 13px; font-weight: 700; margin-bottom: 4px; }
.ratio-card-amount { font-size: 16px; font-weight: 700; font-variant-numeric: tabular-nums; }
.ratio-card-target-amount { font-size: 11px; color: var(--text-tertiary); margin-top: 6px; display: flex; align-items: center; gap: 6px; flex-wrap: wrap; }
.status { display: inline-flex; align-items: center; gap: 2px; font-size: 10px; font-weight: 700; padding: 2px 6px; border-radius: 6px; }
.status.ok { background: var(--success-soft); color: var(--success-text); }
.status.over { background: var(--danger-soft); color: var(--danger-text); }
.status.under { background: var(--warning-soft); color: var(--warning-text); }
.ratio-help { display: flex; gap: 10px; padding: 12px 14px; background: var(--bg-subtle); border-radius: 10px; font-size: 12px; line-height: 1.5; color: var(--text-secondary); margin-top: 16px; font-weight: 400; }
.ratio-help svg { flex-shrink: 0; margin-top: 2px; color: var(--warning); }

.rest-to-live .rest-grid { display: grid; grid-template-columns: 1fr auto 1fr auto 1.4fr; gap: 12px; align-items: center; }
@media (max-width: 700px) { .rest-to-live .rest-grid { grid-template-columns: 1fr; } .rest-arrow { display: none; } }
.rest-item { padding: 12px 14px; border-radius: 10px; background: var(--bg-subtle); }
.rest-item.highlight { background: var(--primary-soft); border: 2px solid var(--primary); }
.rest-arrow { font-size: 24px; font-weight: 700; color: var(--text-tertiary); text-align: center; }
.rest-label { font-size: 11px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.rest-value { font-size: 20px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; }
.rest-item.highlight .rest-value { color: var(--primary); }
.rest-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; font-weight: 600; }

.budget-summary { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
.bs-card { padding: 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-sm); }
.bs-card.respected { border-color: var(--success); }
.bs-card.over { border-color: var(--danger); }
.bs-num { font-size: 28px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1; }
.bs-card.respected .bs-num { color: var(--success); }
.bs-card.over .bs-num { color: var(--danger); }
.bs-card.total .bs-num { color: var(--primary); }
.bs-label { font-size: 11px; color: var(--text-tertiary); margin-top: 4px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }

.budget-list { display: flex; flex-direction: column; gap: 10px; }
.budget-item-v2 { padding: 14px; background: var(--bg-subtle); border-radius: 12px; transition: all 0.15s; }
.budget-item-v2:hover { background: var(--bg-card-hover); }
.budget-item-v2.over { background: var(--danger-soft); }
.budget-item-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 8px; flex-wrap: wrap; }
.budget-info { display: flex; align-items: center; gap: 10px; flex: 1; min-width: 0; }
.budget-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
.budget-info-text { display: flex; flex-direction: column; }
.budget-name { font-size: 14px; font-weight: 700; }
.budget-kind { font-size: 10px; color: var(--text-tertiary); font-weight: 600; text-transform: uppercase; letter-spacing: 0.04em; }
.budget-amounts { display: flex; align-items: center; gap: 4px; }
.budget-spent { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.budget-divider { font-size: 14px; color: var(--text-tertiary); margin: 0 4px; }
.budget-input { width: 80px; text-align: right; }
.budget-currency { font-size: 12px; color: var(--text-tertiary); margin-left: 2px; }
.budget-bar { position: relative; height: 8px; background: var(--bg-card); border-radius: 4px; overflow: hidden; margin-bottom: 6px; }
.budget-fill { height: 100%; transition: width 0.6s ease; border-radius: 4px; }
.budget-bar.ok .budget-fill { background: var(--success); }
.budget-bar.warning .budget-fill { background: var(--warning); }
.budget-bar.danger .budget-fill { background: var(--danger); }
.budget-projection-marker { position: absolute; top: -2px; bottom: -2px; width: 2px; background: var(--text-primary); border-radius: 1px; }
.budget-meta { display: flex; justify-content: space-between; align-items: center; gap: 8px; font-size: 11px; color: var(--text-tertiary); flex-wrap: wrap; }
.budget-warning { color: var(--warning-text); font-weight: 700; }
.budget-danger { color: var(--danger-text); font-weight: 700; }
.suggestion-btn { display: inline-flex; align-items: center; gap: 4px; padding: 3px 8px; background: var(--primary-soft); color: var(--primary-text); border: none; border-radius: 6px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; }
.suggestion-btn:hover { background: var(--primary); color: white; }
.quick-set-btn { display: inline-flex; align-items: center; gap: 4px; padding: 6px 10px; background: transparent; color: var(--primary); border: 1px dashed var(--primary); border-radius: 8px; font-size: 11px; font-weight: 600; cursor: pointer; font-family: inherit; margin-top: 4px; }
.quick-set-btn:hover { background: var(--primary-soft); }

/* WEALTH */
.wealth-view { display: flex; flex-direction: column; gap: 20px; }
.wealth-kpis { display: grid; grid-template-columns: repeat(auto-fit, minmax(160px, 1fr)); gap: 12px; }
.wk-card { padding: 16px 18px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-sm); }
.wk-card.warn { border-color: var(--warning-text); background: var(--warning-soft); }
.wk-label { font-size: 11px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.wk-value { font-size: 22px; font-weight: 800; font-variant-numeric: tabular-nums; margin-top: 4px; line-height: 1.1; }
.wk-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 3px; }
.allocation-card .card-header { border-bottom: 1px solid var(--border); padding-bottom: 12px; margin-bottom: 16px; }
.allocation-body { display: flex; align-items: center; gap: 32px; flex-wrap: wrap; }
.allocation-legend { flex: 1; min-width: 180px; display: flex; flex-direction: column; gap: 8px; }
.alloc-row { display: flex; align-items: center; gap: 10px; }
.alloc-dot { width: 10px; height: 10px; border-radius: 50%; flex-shrink: 0; }
.alloc-name { flex: 1; font-size: 13px; font-weight: 600; color: var(--text-primary); }
.alloc-pct { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; color: var(--text-secondary); min-width: 42px; text-align: right; }
.alloc-val { font-size: 13px; font-variant-numeric: tabular-nums; font-weight: 600; color: var(--text-tertiary); min-width: 90px; text-align: right; }
.wealth-summary { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 14px; }
.ws-card { display: flex; align-items: center; gap: 14px; padding: 18px 20px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 14px; box-shadow: var(--shadow-sm); }
.ws-icon { width: 44px; height: 44px; border-radius: 11px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.ws-card.positive .ws-icon { background: var(--success-soft); color: var(--success-text); }
.ws-card.negative .ws-icon { background: var(--danger-soft); color: var(--danger-text); }
.ws-card.net .ws-icon { background: var(--primary-soft); color: var(--primary-text); }
.ws-content { flex: 1; min-width: 0; }
.ws-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
.ws-value { font-size: 24px; font-weight: 800; font-variant-numeric: tabular-nums; line-height: 1.1; margin-top: 2px; }
.ws-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.wealth-empty { padding: 24px; }
.wealth-empty p { font-size: 13px; color: var(--text-secondary); margin: 0 0 16px; font-weight: 400; }
.asset-types-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(220px, 1fr)); gap: 8px; }
.asset-type-btn { display: flex; align-items: center; gap: 10px; padding: 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; transition: all 0.15s; text-align: left; font-family: inherit; }
.asset-type-btn:hover { background: var(--bg-card-hover); border-color: var(--border-strong); transform: translateY(-1px); }
.att-icon { width: 36px; height: 36px; border-radius: 10px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.att-name { font-size: 13px; font-weight: 700; color: var(--text-primary); }
.att-desc { font-size: 11px; color: var(--text-tertiary); line-height: 1.3; margin-top: 2px; }
.asset-group { margin-bottom: 16px; }
.asset-group-header { display: flex; align-items: center; gap: 10px; padding: 10px 4px; border-bottom: 1px solid var(--border); margin-bottom: 8px; }
.agh-icon { width: 28px; height: 28px; border-radius: 8px; display: flex; align-items: center; justify-content: center; }
.agh-name { font-size: 12px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.agh-count { font-size: 11px; color: var(--text-tertiary); padding: 2px 8px; background: var(--bg-subtle); border-radius: 8px; font-weight: 600; }
.agh-total { margin-left: auto; font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.asset-list { display: flex; flex-direction: column; gap: 8px; }
.asset-card-v2 { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-subtle); border-radius: 10px; }
.asset-card-v2:hover { background: var(--bg-card-hover); }
.asset-card-main { flex: 1; min-width: 0; }
.asset-card-name { font-size: 14px; font-weight: 700; }
.asset-card-meta { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.asset-card-notes { font-size: 11px; color: var(--text-secondary); margin-top: 4px; font-style: italic; }
.asset-card-value { font-size: 16px; font-weight: 800; font-variant-numeric: tabular-nums; }
.asset-card-actions { display: flex; gap: 4px; }

.liability-list { display: flex; flex-direction: column; gap: 12px; }
.liability-card-v2 { padding: 14px; background: var(--bg-subtle); border-radius: 12px; }
.lia-header { display: flex; align-items: center; gap: 10px; margin-bottom: 12px; }
.lia-icon { width: 30px; height: 30px; border-radius: 8px; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.lia-name-block { flex: 1; min-width: 0; }
.lia-name { font-size: 14px; font-weight: 700; display: block; }
.lia-type { font-size: 11px; color: var(--text-tertiary); }
.lia-actions { display: flex; gap: 4px; }
.lia-stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 8px; padding: 10px; background: var(--bg-card); border-radius: 8px; margin-bottom: 10px; }
.lia-stat { display: flex; flex-direction: column; gap: 2px; }
.lia-label { font-size: 10px; color: var(--text-tertiary); font-weight: 700; text-transform: uppercase; letter-spacing: 0.04em; }
.lia-value { font-size: 14px; font-weight: 700; font-variant-numeric: tabular-nums; }
.lia-progress-bar { height: 6px; background: var(--bg-card); border-radius: 3px; overflow: hidden; margin-bottom: 4px; }
.lia-progress-fill { height: 100%; background: var(--gradient-success); border-radius: 3px; }
.lia-progress-info { display: flex; justify-content: space-between; align-items: center; font-size: 11px; color: var(--text-tertiary); font-weight: 600; }

/* TRANSACTIONS */
.transactions-view { display: flex; flex-direction: column; gap: 16px; }
.filters-bar { display: flex; align-items: center; gap: 8px; padding: 12px; background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); flex-wrap: wrap; box-shadow: var(--shadow-sm); }
.search-box { display: flex; align-items: center; gap: 6px; padding: 0 10px; background: var(--bg-subtle); border-radius: 8px; flex: 1; min-width: 200px; border: 1px solid transparent; }
.search-box svg { color: var(--text-tertiary); flex-shrink: 0; }
.search-box input { border: none; background: transparent; padding: 8px 0; font-size: 13px; flex: 1; color: var(--text-primary); font-family: inherit; }
.search-box input:focus { outline: none; box-shadow: none; }
.result-count { font-size: 11px; color: var(--text-tertiary); margin-left: auto; }
.tx-table { background: var(--bg-card); border-radius: 12px; border: 1px solid var(--border); overflow: hidden; box-shadow: var(--shadow-sm); }
.tx-header, .tx-row { display: grid; grid-template-columns: 90px minmax(180px, 1fr) 160px 140px 110px 50px; gap: 12px; padding: 10px 16px; align-items: center; }
.tx-header { background: var(--bg-subtle); border-bottom: 1px solid var(--border); font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; letter-spacing: 0.04em; font-weight: 700; }
.tx-header .th { display: flex; align-items: center; gap: 4px; }
.tx-header .th.right { justify-content: flex-end; }
.tx-header .sortable { cursor: pointer; }
.tx-header .sortable:hover { color: var(--text-primary); }
.tx-row { border-bottom: 1px solid var(--border-light); transition: background 0.15s; }
.tx-row:hover { background: var(--bg-subtle); }
.tx-row:last-child { border-bottom: none; }
.td { font-size: 13px; }
.td-date { color: var(--text-tertiary); font-size: 12px; font-variant-numeric: tabular-nums; }
.td-label { display: flex; align-items: center; gap: 8px; min-width: 0; }
.td-label > span { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; flex: 1; min-width: 0; }
.recurring-toggle { display: inline-flex; align-items: center; justify-content: center; width: 22px; height: 22px; border-radius: 6px; background: transparent; border: 1px solid var(--border); color: var(--text-tertiary); cursor: pointer; flex-shrink: 0; }
.recurring-toggle:hover { background: var(--bg-subtle); color: var(--text-primary); }
.recurring-toggle.active { background: var(--purple-soft); border-color: var(--purple); color: var(--purple); }
.cat-pill { display: inline-flex; align-items: center; gap: 4px; padding: 5px 10px; border-radius: 8px; font-size: 11px; font-weight: 700; border: none; cursor: pointer; font-family: inherit; }
.cat-pill:hover { opacity: 0.85; }
.td-acc { font-size: 12px; color: var(--text-tertiary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.td-amount { font-weight: 700; font-variant-numeric: tabular-nums; }
.td-amount.positive { color: var(--success); }
.td-amount.right { text-align: right; }
.td-actions { display: flex; gap: 4px; justify-content: flex-end; }
.tx-more { padding: 14px; text-align: center; font-size: 12px; color: var(--text-tertiary); background: var(--bg-subtle); }

/* ANALYSIS */
.analysis-view { display: flex; flex-direction: column; gap: 20px; }
.merchants-list { display: flex; flex-direction: column; gap: 8px; }
.merchant-row { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 8px; }
.merchant-row:hover { background: var(--bg-subtle); }
.merchant-rank { font-size: 12px; font-weight: 800; color: var(--text-tertiary); width: 24px; font-variant-numeric: tabular-nums; }
.merchant-info { flex: 1; min-width: 0; }
.merchant-name { font-size: 13px; font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.merchant-meta { font-size: 10px; color: var(--text-tertiary); }
.merchant-total { font-size: 13px; font-weight: 700; font-variant-numeric: tabular-nums; }

/* SETTINGS */
.settings-view { display: flex; flex-direction: column; gap: 20px; }
.member-list { display: flex; flex-direction: column; gap: 8px; }
.member-card { display: flex; align-items: center; gap: 12px; padding: 12px; background: var(--bg-subtle); border-radius: 10px; }
.member-card:hover { background: var(--bg-card-hover); }
.member-card-info { flex: 1; min-width: 0; }
.member-card-name { font-size: 14px; font-weight: 700; }
.member-card-role { font-size: 11px; color: var(--text-tertiary); margin-top: 2px; }
.settings-buttons { display: flex; flex-wrap: wrap; gap: 8px; }
.settings-info { display: flex; gap: 10px; padding: 12px; background: var(--bg-subtle); border-radius: 10px; font-size: 12px; line-height: 1.5; color: var(--text-secondary); margin-top: 16px; font-weight: 400; }
.settings-info svg { flex-shrink: 0; margin-top: 2px; color: var(--warning); }

/* MODAL */
.modal-backdrop { position: fixed; inset: 0; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 20px; backdrop-filter: blur(4px); }
.modal { background: var(--bg-card); border-radius: 16px; max-width: 520px; width: 100%; max-height: 90vh; overflow-y: auto; box-shadow: var(--shadow-xl); border: 1px solid var(--border); }
.modal-header { display: flex; justify-content: space-between; align-items: center; padding: 20px 24px; border-bottom: 1px solid var(--border); }
.modal-header h2 { font-size: 18px; font-weight: 700; margin: 0; }
.modal-body { padding: 20px 24px; display: flex; flex-direction: column; gap: 14px; }
.modal-footer { display: flex; justify-content: flex-end; gap: 8px; padding: 16px 24px; border-top: 1px solid var(--border); }
.member-checks { display: flex; flex-wrap: wrap; gap: 8px; }
.member-check { display: flex; align-items: center; gap: 8px; padding: 8px 12px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 22px; font-size: 12px; cursor: pointer; transition: all 0.15s; font-weight: 600; }
.member-check:hover { background: var(--bg-card-hover); }
.member-check.active { background: var(--primary-soft); border-color: var(--primary); }
.member-check input { display: none; }
.color-picker { display: flex; gap: 8px; flex-wrap: wrap; }
.color-dot { width: 32px; height: 32px; border-radius: 50%; border: 3px solid transparent; cursor: pointer; transition: all 0.15s; }
.color-dot.active { border-color: var(--text-primary); transform: scale(1.1); }

/* IMPORT */
.import-flow { background: var(--bg-card); border: 1px solid var(--border); border-radius: 16px; padding: 28px; box-shadow: var(--shadow-sm); }
.import-header { margin-bottom: 24px; }
.import-header h2 { font-size: 22px; font-weight: 700; margin: 12px 0 4px; letter-spacing: -0.02em; }
.import-header p { font-size: 13px; color: var(--text-tertiary); margin: 0; }
.import-progress { display: flex; align-items: center; gap: 12px; margin-bottom: 16px; }
.import-progress .step { display: flex; align-items: center; gap: 6px; font-size: 12px; color: var(--text-tertiary); font-weight: 600; }
.import-progress .step.active { color: var(--primary); }
.import-progress .step.done { color: var(--success); }
.import-progress .step-num { width: 22px; height: 22px; border-radius: 50%; background: var(--bg-subtle); border: 2px solid var(--border); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; }
.import-progress .step.active .step-num { background: var(--primary); color: white; border-color: var(--primary); }
.import-progress .step.done .step-num { background: var(--success); color: white; border-color: var(--success); }
.upload-zone { display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 48px 24px; border: 2px dashed var(--border-strong); border-radius: 14px; cursor: pointer; transition: all 0.2s; gap: 12px; background: var(--bg-subtle); }
.upload-zone:hover { border-color: var(--primary); background: var(--primary-soft); }
.upload-icon { width: 56px; height: 56px; border-radius: 14px; background: var(--primary-soft); color: var(--primary); display: flex; align-items: center; justify-content: center; }
.upload-main { font-size: 15px; font-weight: 700; color: var(--text-primary); }
.upload-sub { font-size: 12px; color: var(--text-tertiary); }
.import-tips { display: flex; gap: 10px; padding: 12px; background: var(--warning-soft); color: var(--warning-text); border-radius: 10px; font-size: 12px; line-height: 1.5; margin-top: 16px; font-weight: 400; }
.import-tips svg { flex-shrink: 0; margin-top: 2px; }
.detection-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: var(--success-soft); color: var(--success-text); border-radius: 8px; font-size: 12px; font-weight: 600; margin-top: 8px; }
.mapping-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; margin-bottom: 20px; }
.mapping-field { display: flex; flex-direction: column; gap: 6px; }
.mapping-field.required .mapping-label::after { content: ' *'; color: var(--danger); }
.mapping-label { font-size: 11px; color: var(--text-tertiary); text-transform: uppercase; font-weight: 700; letter-spacing: 0.04em; }
.csv-preview { padding: 12px; background: var(--bg-subtle); border-radius: 10px; margin-bottom: 20px; font-size: 11px; overflow-x: auto; }
.csv-preview strong { display: block; margin-bottom: 8px; }
.csv-preview table { width: 100%; border-collapse: collapse; }
.csv-preview th, .csv-preview td { padding: 6px 8px; text-align: left; border-bottom: 1px solid var(--border); white-space: nowrap; max-width: 180px; overflow: hidden; text-overflow: ellipsis; }
.csv-preview th { font-weight: 700; color: var(--text-secondary); }
.account-form { display: flex; flex-direction: column; gap: 14px; margin-bottom: 20px; }
.preview-list { max-height: 400px; overflow-y: auto; border: 1px solid var(--border); border-radius: 10px; margin-bottom: 16px; }
.preview-row { display: grid; grid-template-columns: 80px 1fr 130px 100px; gap: 10px; padding: 8px 12px; align-items: center; border-bottom: 1px solid var(--border-light); font-size: 12px; }
.preview-row:last-child { border-bottom: none; }
.ai-badge { display: inline-flex; align-items: center; margin-left: 6px; font-size: 11px; vertical-align: middle; opacity: 0.85; }
.prev-date { color: var(--text-tertiary); font-variant-numeric: tabular-nums; }
.prev-label { white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-cat { padding: 3px 8px; border-radius: 6px; font-size: 11px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.prev-amount { text-align: right; font-weight: 700; font-variant-numeric: tabular-nums; }
.prev-amount.positive { color: var(--success); }
.preview-more { padding: 10px; text-align: center; font-size: 12px; color: var(--text-tertiary); background: var(--bg-subtle); }
.flow-actions { display: flex; justify-content: space-between; gap: 12px; }

/* TOAST */
.toast { position: fixed; top: 20px; right: 20px; z-index: 2000; padding: 12px 16px; background: var(--bg-card); border: 1px solid var(--border); border-radius: 12px; box-shadow: var(--shadow-lg); animation: slideIn 0.3s ease-out; max-width: 360px; }
.toast-success { border-color: var(--success); }
.toast-warning { border-color: var(--warning); }
.toast-error { border-color: var(--danger); }
.toast-content { font-size: 13px; font-weight: 600; }
@keyframes slideIn { from { opacity: 0; transform: translateX(20px); } to { opacity: 1; transform: translateX(0); } }

/* ============================================================================
 * MOBILE RESPONSIVE — bottom nav, full-screen modals, table compression
 * Single breakpoint at 760px covers phones + most small tablets in portrait.
 * ============================================================================ */
@media (max-width: 760px) {
  /* Header: compact, single row, hide tagline */
  .app-header { padding: 10px 14px; gap: 8px; flex-wrap: nowrap; }
  .brand { gap: 10px; min-width: 0; }
  .brand-tagline { display: none; }
  .brand-name { font-size: 15px; }
  .brand-mark { width: 32px; height: 32px; }
  .header-actions { gap: 4px; flex-shrink: 0; }
  .icon-btn { width: 32px; height: 32px; }

  /* Page content: extra bottom padding to clear the bottom nav */
  .content { padding: 16px 14px calc(96px + env(safe-area-inset-bottom, 0px)); }
  .page-title { font-size: 22px; }
  .monthly-header h1 { font-size: 22px; }

  /* Member bar shrinks */
  .member-bar { padding: 10px 14px 0; }
  .member-tab { padding: 6px 12px; font-size: 12px; }
  .member-context { font-size: 11px; padding: 8px 0; }

  /* Main nav becomes a fixed bottom tab bar (native-app feel) */
  .main-nav {
    position: fixed;
    left: 0; right: 0; bottom: 0;
    z-index: 90;
    display: flex;
    justify-content: space-around;
    background: ${dark ? 'rgba(21, 23, 28, 0.94)' : 'rgba(255, 255, 255, 0.95)'};
    backdrop-filter: blur(14px);
    border-top: 1px solid var(--border);
    border-radius: 0;
    padding: 6px 4px calc(6px + env(safe-area-inset-bottom, 0px));
    overflow-x: visible;
    gap: 0;
  }
  .main-nav button {
    flex: 1;
    flex-direction: column;
    gap: 3px;
    padding: 6px 4px;
    font-size: 10px;
    font-weight: 500;
    border-radius: 6px;
    color: var(--text-tertiary);
    min-width: 0;
    background: transparent;
  }
  .main-nav button svg { width: 18px; height: 18px; }
  .main-nav button span { font-size: 10px; line-height: 1.1; white-space: nowrap; }
  .main-nav button:hover { background: transparent; color: var(--text-secondary); }
  .main-nav button.active { background: transparent; color: var(--primary); box-shadow: none; }
  .main-nav button { position: relative; }
  .nav-alert-dot {
    position: absolute;
    top: 4px;
    right: 16px;
    margin-left: 0;
    min-width: 14px;
    height: 14px;
    font-size: 9px;
    padding: 0 4px;
  }

  /* Cards: less padding */
  .card { padding: 18px; border-radius: 10px; }
  .kpi-card { padding: 18px; border-radius: 10px; }
  .kpi-card-value { font-size: 24px; }
  .kpi-card--primary .kpi-card-value { font-size: 28px; }
  .card-header { margin-bottom: 14px; }

  /* Hero KPIs already collapse via existing rule. Tighten gaps. */
  .hero-kpis { gap: 10px; }
  .dashboard-grid { grid-template-columns: 1fr; gap: 12px; }
  .dashboard { gap: 16px; }

  /* Trésorerie / Wealth grids stack */
  .monthly-kpis { grid-template-columns: 1fr 1fr; gap: 8px; }
  .mk-card { padding: 12px 14px; gap: 10px; }
  .mk-icon { width: 32px; height: 32px; }
  .mk-value { font-size: 17px; }
  .wealth-kpis { grid-template-columns: 1fr 1fr; }
  .wealth-summary { grid-template-columns: 1fr; }
  .ws-card { padding: 14px 16px; gap: 12px; }
  .ws-value { font-size: 19px; }
  .budget-summary { grid-template-columns: 1fr; }
  .ratio-cards { grid-template-columns: 1fr; }
  .projection-grid { grid-template-columns: 1fr; }

  /* Allocation donut + legend stack */
  .allocation-body { flex-direction: column; gap: 16px; }
  .composition-row { flex-direction: column; gap: 16px; }
  .legend-list { padding-left: 0; width: 100%; }

  /* Modals slide up from the bottom on mobile, full width */
  .modal-backdrop { padding: 0; align-items: flex-end; }
  .modal {
    max-width: 100%;
    max-height: 92vh;
    border-radius: 14px 14px 0 0;
    border-bottom: none;
  }
  .modal-header { padding: 16px 18px; }
  .modal-body { padding: 16px 18px; }
  .modal-footer { padding: 14px 18px; }

  /* Transactions table → card-style rows on mobile */
  .tx-table { border-radius: 10px; }
  .tx-header { display: none; }
  .tx-row {
    grid-template-columns: 1fr auto;
    gap: 4px 10px;
    padding: 12px 14px;
    align-items: start;
  }
  .tx-row .td-date { grid-column: 1 / -1; font-size: 10px; order: 1; margin-bottom: 2px; }
  .tx-row .td-label { grid-column: 1; order: 2; min-width: 0; }
  .tx-row .td-cat, .tx-row .td-acc { grid-column: 1; order: 3; font-size: 11px; }
  .tx-row .td-amount { grid-column: 2; order: 2; font-size: 14px; align-self: center; }
  .tx-row .td-actions { grid-column: 1 / -1; order: 4; justify-content: flex-end; margin-top: 4px; }

  /* Filters bar: stack and smaller */
  .filters-bar { padding: 10px; gap: 6px; }
  .search-box { min-width: 0; flex: 1 1 100%; order: -1; }
  .result-count { display: none; }

  /* Onboarding: tighter padding */
  .onboarding { padding: 16px 12px; }
  .onboarding-card { padding: 24px 20px; border-radius: 14px; }
  .onboarding-step-content h1 { font-size: 22px; }
  .onboarding-step-content h2 { font-size: 19px; }
  .onboarding-features-grid { grid-template-columns: 1fr; }

  /* Import flow: tighter */
  .import-flow { padding: 18px; border-radius: 12px; }
  .upload-zone { padding: 32px 16px; }

  /* Buttons: full-width primary CTAs feel native on mobile */
  .primary-btn-large { width: 100%; justify-content: center; }
  .empty-actions .primary-btn-large { width: auto; }
  .flow-actions { flex-wrap: wrap; }

  /* Toast spans full width minus padding */
  .toast { left: 12px; right: 12px; top: 12px; max-width: none; }
}

/* Very narrow phones — extra tightening */
@media (max-width: 380px) {
  .monthly-kpis { grid-template-columns: 1fr; }
  .wealth-kpis { grid-template-columns: 1fr; }
  .main-nav button span { display: none; }
  .main-nav button svg { width: 20px; height: 20px; }
  .main-nav button { padding: 8px 4px; }
}
`;
  return <style>{css}</style>;
}
