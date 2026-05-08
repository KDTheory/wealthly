// ============================================================================
// Wealthly — pure utilities
//
// Formatting, CSV parsing, transaction categorization, recurring detection.
// No React, no DOM access, no network. These functions must remain testable
// in isolation.
// ============================================================================

import { DEFAULT_RULES, BANK_PROFILES } from './constants.js';

// ---- Account roles --------------------------------------------------------
// Five cashflow roles, mapped to a 3-axis ruleset:
//   includeInNetWorth   — does the balance count toward patrimoine net?
//   countsAsIncome      — do positive transactions = real income?
//   countsAsExpense     — do negative transactions = real spending?
//
// Defaults are designed so a fresh-imported account (role='principal') keeps
// the historical behavior — no surprise behavior change for existing data.
export const ACCOUNT_ROLES = {
  principal: {
    label: 'Principal',
    desc: 'Compte courant principal — salaire, dépenses du quotidien.',
    includeInNetWorth: true,
    countsAsIncome: true,
    countsAsExpense: true,
  },
  depenses: {
    label: 'Dépenses secondaires',
    desc: 'Revolut, N26, carte voyage… Les sorties sont des dépenses réelles, mais les entrées sont des virements depuis le compte principal.',
    includeInNetWorth: true,
    countsAsIncome: false,
    countsAsExpense: true,
  },
  epargne: {
    label: 'Épargne',
    desc: 'Livret A, LDDS, PEL… Le solde compte dans le patrimoine, mais les flux entrants/sortants sont des arbitrages, pas du cashflow.',
    includeInNetWorth: true,
    countsAsIncome: false,
    countsAsExpense: false,
  },
  investissement: {
    label: 'Investissement',
    desc: 'PEA, CTO, assurance vie… Le solde compte dans le patrimoine, mais les versements ne sont pas des dépenses.',
    includeInNetWorth: true,
    countsAsIncome: false,
    countsAsExpense: false,
  },
  professionnel: {
    label: 'Professionnel',
    desc: 'Compte pro / micro-entreprise — entièrement exclu du patrimoine personnel et du cashflow mensuel.',
    includeInNetWorth: false,
    countsAsIncome: false,
    countsAsExpense: false,
  },
};

export const ACCOUNT_ROLE_KEYS = Object.keys(ACCOUNT_ROLES);

export const accountIncludeInNetWorth = (role) => (ACCOUNT_ROLES[role] || ACCOUNT_ROLES.principal).includeInNetWorth;
export const accountCountsAsIncome = (role) => (ACCOUNT_ROLES[role] || ACCOUNT_ROLES.principal).countsAsIncome;
export const accountCountsAsExpense = (role) => (ACCOUNT_ROLES[role] || ACCOUNT_ROLES.principal).countsAsExpense;

// ---- Formatting ------------------------------------------------------------

export const formatCurrency = (amount, options = {}) => {
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

export const formatDate = (dateStr, options = {}) => {
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

export const monthKey = (dateStr) => {
  const d = new Date(dateStr);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};

export const dayOfMonth = (dateStr) => {
  const d = new Date(dateStr);
  return d.getDate();
};

export const generateId = () => `${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;

export const hashTransaction = (tx) => `${tx.accountId}|${tx.date}|${tx.amount.toFixed(2)}|${(tx.label || '').slice(0, 50).toLowerCase().trim()}`;

// ---- CSV parsing -----------------------------------------------------------

export const detectDelimiter = (text) => {
  const sample = text.split('\n').slice(0, 5).join('\n');
  const counts = { ';': (sample.match(/;/g) || []).length, ',': (sample.match(/,/g) || []).length, '\t': (sample.match(/\t/g) || []).length };
  return Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
};

export const parseCSVLine = (line, delimiter) => {
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

export const parseCSV = (text) => {
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

export const detectBankProfile = (headers) => {
  for (const [id, profile] of Object.entries(BANK_PROFILES)) {
    if (profile.detect(headers)) return { id, profile };
  }
  return null;
};

export const autoDetectMapping = (headers) => {
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

export const parseAmount = (str) => {
  if (str === null || str === undefined || str === '') return 0;
  if (typeof str === 'number') return str;
  let s = String(str).replace(/[€$£\s ]/g, '').trim();
  if (s.includes(',') && !s.includes('.')) s = s.replace(',', '.');
  else if (s.includes(',') && s.includes('.')) s = s.replace(/,/g, '');
  const n = parseFloat(s);
  return isNaN(n) ? 0 : n;
};

export const parseDate = (str) => {
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

export const applyMapping = (rows, mapping, accountId, options = {}) => {
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

// ---- Categorization & recurring detection ----------------------------------

export const categorize = (tx, customRules = []) => {
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

// Loan amortization schedule. Returns an array of monthly rows with
// { idx, date, capital, interest, insurance, payment, remaining }.
// paymentOverride lets the UI lock the row total to whatever the user actually
// pays each month; without it we compute the standard annuity.
export const buildAmortization = ({ principal, annualRate, durationM, insuranceRate, startDate, paymentOverride }) => {
  const P = parseFloat(principal) || 0;
  const n = parseInt(durationM, 10) || 0;
  const r = (parseFloat(annualRate) || 0) / 100 / 12;
  const ins = ((parseFloat(insuranceRate) || 0) / 100 / 12) * P;
  if (P <= 0 || n <= 0) return [];

  const monthlyKap = paymentOverride
    ? Math.max(0, parseFloat(paymentOverride) - ins)
    : (r > 0 ? P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / n);

  let remaining = P;
  const start = startDate ? new Date(startDate) : new Date();
  const rows = [];
  for (let i = 0; i < n; i++) {
    const interest = remaining * r;
    let capital = monthlyKap - interest;
    if (capital > remaining) capital = remaining;
    remaining = Math.max(0, remaining - capital);
    const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
    rows.push({
      idx: i + 1,
      date: d.toISOString().slice(0, 10),
      capital,
      interest,
      insurance: ins,
      payment: capital + interest + ins,
      remaining,
    });
  }
  return rows;
};

export const detectRecurring = (transactions, overrides = {}) => {
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
