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

// Heuristic role suggestion from transaction patterns. Returns
// { role, confidence } where confidence is 'high' | 'medium' | 'low'. Used
// in the Settings UI to nudge the user when the freshly-imported default
// 'principal' is clearly wrong (e.g. a Revolut top-up account, a Livret).
//
// Rules (evaluated in order, first match wins):
//   • Salary pattern (≥2 recurring large positives ≥ 1 200€ around month-end)
//     → principal
//   • ≥80% of inflow € comes from one other account in `otherAccounts`
//     → depenses (it's a spend bucket fed from somewhere else)
//   • Mostly transfers (≥70% of total tx count have round amounts > 100€
//     and category is empty/transfer)                            → epargne
//   • Negative-only or near-zero outflows but positive net        → epargne
//   • Mostly small recurrent expenses, some inflow                → principal
// Otherwise → unknown (no suggestion).
export const suggestAccountRole = (transactions, otherAccountIds = []) => {
  if (!Array.isArray(transactions) || transactions.length < 5) {
    return { role: null, confidence: 'low', reason: 'Pas assez de transactions pour estimer.' };
  }
  const inflows = transactions.filter(t => t.amount > 0);
  const outflows = transactions.filter(t => t.amount < 0);
  const totalIn = inflows.reduce((s, t) => s + t.amount, 0);
  const totalOut = outflows.reduce((s, t) => s + Math.abs(t.amount), 0);

  // Salary-like recurrence: ≥2 inflows ≥ 1 200€ in the last 90 days, on
  // similar days-of-month (within 5 days of each other).
  const big = inflows.filter(t => t.amount >= 1200);
  if (big.length >= 2) {
    const days = big.map(t => new Date(t.date).getDate());
    const dayRange = Math.max(...days) - Math.min(...days);
    if (dayRange <= 5) {
      return { role: 'principal', confidence: 'high', reason: `Salaire détecté (${big.length} entrées ≥ 1 200€ autour du même jour du mois).` };
    }
  }

  // Internal-transfer dominance: most inflows look like virements from
  // your own accounts. We can't introspect amounts here cheaply, so we
  // approximate via labels — if 60%+ of inflows have a virement-like
  // label, treat as a depenses bucket.
  const virementInflows = inflows.filter(t => /\b(virement|transfer|transfert|wise|revolut|to\s+\w+)\b/i.test(t.label || ''));
  if (inflows.length >= 3 && virementInflows.length / inflows.length >= 0.6 && outflows.length >= 5) {
    return { role: 'depenses', confidence: 'medium', reason: `${Math.round((virementInflows.length / inflows.length) * 100)}% des entrées ressemblent à des virements depuis un autre compte.` };
  }

  // Savings-like: lots of round inflows, few small outflows.
  const roundInflows = inflows.filter(t => Math.abs(t.amount % 50) < 0.01 && t.amount >= 100);
  if (roundInflows.length / Math.max(transactions.length, 1) >= 0.5 && outflows.length <= 3) {
    return { role: 'epargne', confidence: 'medium', reason: 'Surtout des versements ronds, peu de dépenses individuelles.' };
  }

  // Net positive without recurrence + few outflows → likely épargne
  if (totalIn > totalOut * 3 && outflows.length <= 5) {
    return { role: 'epargne', confidence: 'low', reason: 'Solde net très positif et peu de sorties — comportement de compte épargne.' };
  }

  // Default: principal — too noisy a pattern to label otherwise
  return { role: 'principal', confidence: 'low', reason: 'Mélange entrées / sorties habituel pour un compte courant.' };
};

// ---- Internal-transfer detection -----------------------------------------
// Pair-match transactions that look like "I moved money between two of my
// own accounts" so the cashflow aggregator can ignore them — otherwise a
// virement of €1 000 from principal to épargne would inflate both expenses
// and income by €1 000.
//
// Pairing rules:
//   1. Absolute amounts within tolerance (1€ or 1% of the larger, whichever
//      is bigger) — accommodates Wise / forex where commission shaves a few
//      euros off the receiving leg
//   2. Opposite signs (one positive, one negative)
//   3. Two distinct accounts that the user owns
//   4. Within ±windowDays days of each other (default 3 — covers slow IBAN
//      virements that take 2 banking days)
//   5. Each transaction can only be matched once (greedy, earliest-first,
//      best amount-match wins for a given outflow)
//
// Returns a Set<txId> of transactions identified as one side of a transfer.
// O(n²) worst case but in practice tiny — the windowDays filter prunes
// aggressively for any reasonable dataset.
const TRANSFER_LABEL_HINT = /\b(virement|transfer|transfert|vir\.?\s|to\s+\w+|from\s+\w+|wise|revolut)\b/i;
const TRANSFER_AMOUNT_TOLERANCE_ABS = 1.0;     // 1€ floor
const TRANSFER_AMOUNT_TOLERANCE_PCT = 0.01;    // 1% of the larger leg

const amountsMatch = (a, b) => {
  const aa = Math.abs(a);
  const ab = Math.abs(b);
  const tol = Math.max(TRANSFER_AMOUNT_TOLERANCE_ABS, Math.max(aa, ab) * TRANSFER_AMOUNT_TOLERANCE_PCT);
  return Math.abs(aa - ab) <= tol;
};

export const detectInternalTransfers = (transactions, options = {}) => {
  const { windowDays = 3, requireLabelHint = false } = options;
  const transferIds = new Set();
  const pairs = []; // [{ outTxId, inTxId, fromAccountId, toAccountId, amount, date }]
  if (!Array.isArray(transactions) || transactions.length < 2) {
    transferIds.pairs = pairs;
    return transferIds;
  }

  const sorted = [...transactions]
    .filter(t => t && typeof t.amount === 'number' && t.amount !== 0)
    .sort((a, b) => a.date.localeCompare(b.date));

  const windowMs = windowDays * 86400000;
  const matched = new Set();

  for (let i = 0; i < sorted.length; i++) {
    const a = sorted[i];
    if (matched.has(a.id)) continue;
    let bestJ = -1;
    let bestDelta = Infinity;
    const aDate = new Date(a.date).getTime();
    for (let j = i + 1; j < sorted.length; j++) {
      const b = sorted[j];
      const bDate = new Date(b.date).getTime();
      if (bDate - aDate > windowMs) break;
      if (matched.has(b.id)) continue;
      if (a.accountId === b.accountId) continue;
      if (Math.sign(a.amount) === Math.sign(b.amount)) continue;
      if (!amountsMatch(a.amount, b.amount)) continue;
      if (requireLabelHint) {
        const blob = `${a.label || ''} ${b.label || ''}`;
        if (!TRANSFER_LABEL_HINT.test(blob)) continue;
      }
      const delta = Math.abs(Math.abs(a.amount) - Math.abs(b.amount));
      if (delta < bestDelta) {
        bestDelta = delta;
        bestJ = j;
      }
    }
    if (bestJ !== -1) {
      const b = sorted[bestJ];
      transferIds.add(a.id);
      transferIds.add(b.id);
      matched.add(a.id);
      matched.add(b.id);
      const out = a.amount < 0 ? a : b;
      const inLeg = a.amount < 0 ? b : a;
      pairs.push({
        outTxId: out.id,
        inTxId: inLeg.id,
        fromAccountId: out.accountId,
        toAccountId: inLeg.accountId,
        amount: Math.abs(out.amount),
        date: out.date < inLeg.date ? out.date : inLeg.date,
      });
    }
  }
  // Attach pairs as a property on the Set so existing callers that just
  // need ID membership keep working unchanged.
  transferIds.pairs = pairs;
  return transferIds;
};

// ---- Formatting ------------------------------------------------------------

// Supported display currencies for Trove. Adding more is a one-line addition
// here + Frankfurter handles ~30 ISO codes natively.
export const SUPPORTED_CURRENCIES = ['EUR', 'USD', 'GBP', 'CHF'];

export const CURRENCY_LOCALE = {
  EUR: 'fr-FR',
  USD: 'en-US',
  GBP: 'en-GB',
  CHF: 'de-CH',
};

/**
 * Convert an amount from one ISO currency to another using a rates table
 * shaped like { EUR: 1, USD: 1.08, GBP: 0.85, CHF: 0.97 } (rates relative
 * to the base of the table — Frankfurter returns rates relative to the
 * `from` parameter so we always fetch with base=EUR and convert through it).
 *
 * Returns the amount unchanged if either currency is unknown or if rates
 * are missing — never throws so the UI keeps rendering even without rates.
 */
export const convertCurrency = (amount, fromCurrency, toCurrency, rates) => {
  if (!amount || amount === 0) return amount;
  if (!fromCurrency || !toCurrency || fromCurrency === toCurrency) return amount;
  if (!rates) return amount;
  // rates are EUR-base (1 EUR = X foreign). To go from→to via EUR:
  //   amountEUR  = amount / rates[from]
  //   amountTo   = amountEUR * rates[to]
  const r = (c) => (c === 'EUR' ? 1 : rates[c]);
  const fromR = r(fromCurrency);
  const toR = r(toCurrency);
  if (!fromR || !toR) return amount;
  return (amount / fromR) * toR;
};

export const formatCurrency = (amount, options = {}) => {
  const { compact = false, sign = false, currency = 'EUR' } = options;
  const locale = CURRENCY_LOCALE[currency] || 'fr-FR';
  const formatted = new Intl.NumberFormat(locale, {
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
