import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar, ComposedChart, Sankey, Layer, Rectangle } from 'recharts';
import { Upload, Plus, TrendingUp, TrendingDown, Wallet, Home, Coins, CreditCard, Users, Settings, Search, Download, Trash2, Edit3, Check, X, ChevronRight, ChevronLeft, AlertCircle, AlertTriangle, Repeat, Calendar, ArrowUpDown, Eye, EyeOff, Sparkles, PiggyBank, Bitcoin, Banknote, Landmark, BarChart3, Target, Heart, Sun, Moon, Zap, Activity, ArrowUp, ArrowDown, Minus, PartyPopper, Lightbulb, Bell, ChevronUp, Play, Lock, Unlock, LogOut, Cloud, RefreshCw, FileText, Calculator, Link2, Unlink } from 'lucide-react';
import * as api from './api.js';
import { getDemoData } from './demoData.js';
import {
  APP_NAME, STORAGE_KEYS, DEFAULT_CATEGORIES, DEFAULT_RULES, BANK_PROFILES,
  ASSET_TYPES, ASSET_CLASS_MAP, LIABILITY_TYPES, MEMBER_PALETTE,
} from './constants.js';
import { storage } from './storage.js';
import {
  formatCurrency, formatDate, monthKey, dayOfMonth, generateId, hashTransaction,
  parseCSV, detectBankProfile, autoDetectMapping, applyMapping,
  categorize, detectRecurring,
} from './utils.js';
import { Styles } from './Styles.jsx';
import { Toast } from './components/Toast.jsx';
import { AnimatedNumber } from './components/AnimatedNumber.jsx';
import { Onboarding } from './views/Onboarding.jsx';
import { Transactions } from './views/Transactions.jsx';
import { Analysis } from './views/Analysis.jsx';

const TaxSimulator = lazy(() => import('./TaxSimulator.jsx'));

// Disable Recharts animations globally — they cause noticeable jank on iOS Safari
// (SVG <animate> on every render) and add no UX value for static financial data.
[Line, Bar, Area, Pie, RadialBar, Sankey].forEach((C) => {
  if (C) C.defaultProps = { ...(C.defaultProps || {}), isAnimationActive: false };
});

// Tracks whether the viewport is below a breakpoint. Used by chart layouts
// (e.g. Sankey margins) where CSS can't reach.
function useIsNarrow(breakpoint = 760) {
  const [narrow, setNarrow] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= breakpoint : false
  );
  useEffect(() => {
    const onResize = () => setNarrow(window.innerWidth <= breakpoint);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, [breakpoint]);
  return narrow;
}

// ============================================================================
// MAIN APP
// ============================================================================
export default function WealthlyApp({ demoMode = false, onExitDemo }) {
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(false);
  const [view, setView] = useState('dashboard');
  const theme = 'dark';
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
  const [fixedCharges, setFixedCharges] = useState([]);
  const [hideAmounts, setHideAmounts] = useState(false);
  const [toast, setToast] = useState(null);

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
    subtype: a.subtype || null,
    purchasePrice: a.purchase_price ?? null,
    surfaceM2: a.surface_m2 ?? null,
    notaryFees: a.notary_fees ?? null,
    agencyFees: a.agency_fees ?? null,
    worksFees: a.works_fees ?? null,
    furnitureFees: a.furniture_fees ?? null,
    purchaseDate: a.purchase_date || null,
    constructionYear: a.construction_year ?? null,
    ownershipPct: a.ownership_pct ?? 100,
    address: a.address || '',
  });
  const assetToApi = (a) => {
    const numOrNull = (v) => (v === '' || v == null) ? null : parseFloat(v);
    const intOrNull = (v) => (v === '' || v == null) ? null : parseInt(v, 10);
    return {
      type: a.type,
      name: a.name,
      current_value: parseFloat(a.currentValue) || 0,
      notes: a.notes || '',
      member_ids: a.memberIds || [],
      subtype: a.subtype || null,
      purchase_price: numOrNull(a.purchasePrice),
      surface_m2: numOrNull(a.surfaceM2),
      notary_fees: numOrNull(a.notaryFees),
      agency_fees: numOrNull(a.agencyFees),
      works_fees: numOrNull(a.worksFees),
      furniture_fees: numOrNull(a.furnitureFees),
      purchase_date: a.purchaseDate || null,
      construction_year: intOrNull(a.constructionYear),
      ownership_pct: numOrNull(a.ownershipPct) ?? 100,
      address: a.address || null,
    };
  };
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
    downPayment: l.down_payment ?? null,
    insuranceRate: l.insurance_rate ?? null,
    applicationFees: l.application_fees ?? null,
    ownershipPct: l.ownership_pct ?? 100,
    durationMonths: l.duration_months ?? null,
    startDate: l.start_date || null,
    linkedAssetId: l.linked_asset_id || null,
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
    down_payment: l.downPayment !== '' && l.downPayment != null ? parseFloat(l.downPayment) : null,
    insurance_rate: l.insuranceRate !== '' && l.insuranceRate != null ? parseFloat(l.insuranceRate) : null,
    application_fees: l.applicationFees !== '' && l.applicationFees != null ? parseFloat(l.applicationFees) : null,
    ownership_pct: l.ownershipPct !== '' && l.ownershipPct != null ? parseFloat(l.ownershipPct) : 100,
    duration_months: l.durationMonths !== '' && l.durationMonths != null ? parseInt(l.durationMonths, 10) : null,
    start_date: l.startDate || null,
    linked_asset_id: l.linkedAssetId || null,
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
      setFixedCharges([]);
      setCustomRules(d.customRules);
      return;
    }
    try {
      const [memList, accList, txList, astList, liaList, catList, budList, goalList, ruleList, fcList] = await Promise.all([
        api.members.list(),
        api.accounts.list(),
        api.transactions.list(),
        api.assets.list(),
        api.liabilities.list(),
        api.categories.list(),
        api.budgets.list(),
        api.goals.list(),
        api.rules.list(),
        api.fixedCharges.list().catch(() => []),
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
      setFixedCharges(fcList || []);
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
      const [ov, am] = await Promise.all([
        storage.get(STORAGE_KEYS.RECURRING_OVERRIDES, {}),
        storage.get(STORAGE_KEYS.ACTIVE_MEMBER, 'all'),
      ]);
      setRecurringOverrides(ov);
      setActiveMemberId(am);
      setColumnMappings(await storage.get(STORAGE_KEYS.MAPPINGS, {}));
      // Then fetch server data (or load demo dataset if applicable)
      await reloadAll();
      if (demoMode) {
        setOnboarded(true);
      } else {
        // First-time check: onboarded if at least one member exists
        try {
          const me = await api.auth.me();
          const memList = await api.members.list();
          const hasMembers = memList && memList.length > 0;
          setOnboarded(hasMembers);
          // Auto bank-sync at most once per day for admins. Best-effort: a
          // 503 (not configured) or any error is silently swallowed — the
          // user can still trigger a sync manually from Réglages.
          if (me && me.is_admin) {
            const lastSyncKey = `wealthly:lastBankSync:${me.id}`;
            const last = parseInt(localStorage.getItem(lastSyncKey) || '0', 10);
            if (Date.now() - last > 86400000) {
              localStorage.setItem(lastSyncKey, String(Date.now()));
              api.banks.syncAll().then(async (res) => {
                if (res && res.inserted > 0) {
                  await reloadAll();
                }
              }).catch(() => {});
            }
          }
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

  // Toast helper
  const showToast = (message, type = 'info') => {
    setToast({ message, type, id: Date.now() });
    setTimeout(() => setToast(null), 3500);
  };


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
    // Compute the breakdown fields needed by the brut / net / financier toggle.
    const realEstateValue = visibleAssets
      .filter(a => a.type === 'real_estate')
      .reduce((s, a) => s + (parseFloat(a.currentValue) || 0) * memberShare(a), 0);
    const financialAssetsValue = liquidWealth + (assetsValue - realEstateValue);
    const mortgageDebt = visibleLiabilities
      .filter(l => l.type === 'mortgage')
      .reduce((s, l) => s + (parseFloat(l.remainingCapital) || 0) * memberShare(l), 0);
    const otherDebt = liabilitiesValue - mortgageDebt;
    // Round to 1 € so micro-fluctuations don't trigger noisy POSTs.
    const key = `${month}|${Math.round(netWorth)}|${Math.round(liquidWealth)}|${Math.round(assetsValue)}|${Math.round(liabilitiesValue)}|${Math.round(realEstateValue)}|${Math.round(mortgageDebt)}`;
    if (lastSnapshotKeyRef.current === key) return;
    lastSnapshotKeyRef.current = key;
    const handle = setTimeout(() => {
      api.wealthSnapshots.upsert({
        month,
        net_worth: Number(netWorth.toFixed(2)),
        liquid_wealth: Number(liquidWealth.toFixed(2)),
        assets_value: Number(assetsValue.toFixed(2)),
        liabilities_value: Number(liabilitiesValue.toFixed(2)),
        real_estate_value: Number(realEstateValue.toFixed(2)),
        financial_assets_value: Number(financialAssetsValue.toFixed(2)),
        mortgage_debt: Number(mortgageDebt.toFixed(2)),
        other_debt: Number(otherDebt.toFixed(2)),
      }).then((row) => {
        setWealthHistory((prev) => {
          const others = prev.filter((s) => s.month !== row.month);
          return [...others, row].sort((a, b) => a.month.localeCompare(b.month));
        });
      }).catch(() => {});
    }, 1500); // debounce — wait for any settling re-renders before posting
    return () => clearTimeout(handle);
  }, [netWorth, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, visibleLiabilities, memberShare]);

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
      showToast('Foyer configuré.', 'success');
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
          showToast(`${aiCount} transaction${aiCount > 1 ? 's' : ''} catégorisée${aiCount > 1 ? 's' : ''} par IA.`, 'success');
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

  const saveFixedCharge = async (charge) => {
    try {
      const payload = {
        name: charge.name,
        amount: parseFloat(charge.amount) || 0,
        day_of_month: charge.day_of_month || null,
        category_slug: charge.category_slug || null,
        start_month: charge.start_month || null,
        end_month: charge.end_month || null,
        notes: charge.notes || '',
        member_ids: charge.member_ids || [],
      };
      let saved;
      if (charge.id) saved = await api.fixedCharges.update(charge.id, payload);
      else saved = await api.fixedCharges.create(payload);
      setFixedCharges(prev => charge.id ? prev.map(f => f.id === charge.id ? saved : f) : [...prev, saved]);
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const deleteFixedCharge = async (id) => {
    if (!confirm('Supprimer cette charge fixe ?')) return;
    try {
      await api.fixedCharges.delete(id);
      setFixedCharges(prev => prev.filter(f => f.id !== id));
    } catch (err) { showToast('Erreur : ' + err.message, 'error'); }
  };

  const exportData = () => {
    // Export current frontend state as JSON (matches v2 backup format)
    const data = {
      version: 2, app: 'Wealthly', exportedAt: new Date().toISOString(),
      members, accounts, transactions, assets, liabilities, categories, customRules, budgets, columnMappings, recurringOverrides, goals,
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
  // Stable across renders so memoized children aren't invalidated when only
  // an unrelated piece of state changes. Identity flips only when the user
  // toggles "masquer montants".
  const fmt = useCallback(
    (v, opts) => hideAmounts ? '••••' : formatCurrency(v, opts),
    [hideAmounts]
  );

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

      <div className="app-shell">
        {/* Desktop sidebar (≥1024px) */}
        <aside className="app-sidebar">
          <div className="sidebar-brand" onClick={() => setView('dashboard')}>
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width="22" height="22">
                <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
                <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
              </svg>
            </div>
            <div className="brand-name">{APP_NAME}</div>
          </div>

          <nav className="sidebar-nav">
            <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}><Activity size={15}/> <span>Résumé</span></button>
            <button onClick={() => setView('wealth')} className={view === 'wealth' ? 'active' : ''}><Landmark size={15}/> <span>Patrimoine</span></button>
            <button onClick={() => setView('monthly')} className={['monthly','cashflow','budgets'].includes(view) ? 'active' : ''}>
              <Calendar size={15}/> <span>Mensuel</span>
              {budgetsOverCount > 0 && <span className="nav-alert-dot" title={`${budgetsOverCount} budget${budgetsOverCount > 1 ? 's' : ''} dépassé${budgetsOverCount > 1 ? 's' : ''}`}>{budgetsOverCount}</span>}
            </button>
            <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'active' : ''}><BarChart3 size={15}/> <span>Transactions</span></button>
            <button onClick={() => setView('tax')} className={view === 'tax' ? 'active' : ''}><Calculator size={15}/> <span>Impôts</span></button>
            <button onClick={() => setView('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={15}/> <span>Réglages</span></button>
          </nav>

          <div className="sidebar-footer">
            <button className="primary-btn sidebar-import" onClick={() => { setView('import'); setImportStep('upload'); }}>
              <Upload size={14}/> <span>Importer</span>
            </button>
            <div className="sidebar-utilities">
              <button className="icon-btn" onClick={() => setHideAmounts(!hideAmounts)} title="Masquer/afficher">
                {hideAmounts ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
              <button className="icon-btn" onClick={logout} title="Déconnexion">
                <LogOut size={16}/>
              </button>
            </div>
          </div>
        </aside>

        <div className="app-main">
          {/* Mobile-only top bar (<1024px) */}
          <header className="app-header-mobile">
            <div className="brand" onClick={() => setView('dashboard')}>
              <div className="brand-mark">
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width="22" height="22">
                  <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
                  <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
                </svg>
              </div>
              <div className="brand-name">{APP_NAME}</div>
            </div>
            <div className="header-actions">
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
                <button key={m.id} className={`member-tab ${activeMemberId === m.id ? 'active' : ''}`} onClick={() => setActiveMemberId(m.id)}>
                  <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                  <span>{m.name}</span>
                  {m.role === 'child' && <span className="role-badge">enfant</span>}
                </button>
              ))}
            </div>
            {activeMember && (
              <div className="member-context">
                Comptes perso de <strong>{activeMember.name}</strong> + comptes joints partagés
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
            goals={goals} wealthHistory={wealthHistory}
            recurringGroups={recurringGroups} currentMonth={currentMonth}
            setView={setView}
          />
        )}
        {['monthly','cashflow','budgets'].includes(view) && (
          <div className="monthly-hub">
            <nav className="hub-tabs">
              <button onClick={() => setView('monthly')}   className={view === 'monthly'   ? 'active' : ''}><Calendar  size={13}/> <span>Vue mensuelle</span></button>
              <button onClick={() => setView('cashflow')}  className={view === 'cashflow'  ? 'active' : ''}><Activity  size={13}/> <span>Cashflow</span></button>
              <button onClick={() => setView('budgets')}   className={view === 'budgets'   ? 'active' : ''}>
                <Target size={13}/> <span>Budgets</span>
                {budgetsOverCount > 0 && (
                  <span className="nav-alert-dot" style={{ marginLeft: 6 }}>{budgetsOverCount}</span>
                )}
              </button>
            </nav>
            {view === 'monthly' && (
              <Monthly
                transactions={visibleTransactions} accounts={accounts} categories={categories} members={members}
                recurringIds={recurringIds} recurringGroups={recurringGroups}
                monthlyEvolution={monthlyEvolution} thisMonthStats={thisMonthStats}
                anomalies={anomalies}
                categoryAnalysis={categoryAnalysis}
                fixedCharges={fixedCharges} saveFixedCharge={saveFixedCharge} deleteFixedCharge={deleteFixedCharge}
                memberShare={memberShare}
                currentMonth={currentMonth} fmt={fmt}
              />
            )}
            {view === 'cashflow' && (
              <Cashflow
                transactions={visibleTransactions} categories={categories} accounts={accounts}
                memberShare={memberShare} fmt={fmt} currentMonth={currentMonth}
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
          </div>
        )}
        {view === 'tax' && (
          <Suspense fallback={<div className="chart-empty"><Calculator size={28}/><span>Chargement du simulateur…</span></div>}>
            <TaxSimulator transactions={visibleTransactions} />
          </Suspense>
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
        {view === 'settings' && (
          <SettingsView
            members={members} accounts={accounts} accountBalances={accountBalances}
            saveMember={saveMember} deleteMember={deleteMember}
            deleteAccount={deleteAccount}
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
      </div>

      {/* Mobile bottom nav (<1024px) — fixed bottom bar */}
      <nav className="bottom-nav">
        <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}><Activity size={18}/> <span>Résumé</span></button>
        <button onClick={() => setView('wealth')} className={view === 'wealth' ? 'active' : ''}><Landmark size={18}/> <span>Patrimoine</span></button>
        <button onClick={() => setView('monthly')} className={['monthly','cashflow','budgets'].includes(view) ? 'active' : ''}>
          <Calendar size={18}/> <span>Mensuel</span>
          {budgetsOverCount > 0 && <span className="nav-alert-dot">{budgetsOverCount}</span>}
        </button>
        <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'active' : ''}><BarChart3 size={18}/> <span>Transac.</span></button>
        <button onClick={() => setView('tax')} className={view === 'tax' ? 'active' : ''}><Calculator size={18}/> <span>Impôts</span></button>
        <button onClick={() => setView('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={18}/> <span>Réglages</span></button>
      </nav>
    </div>
  );
}


// ============================================================================
// DASHBOARD
// ============================================================================
function Dashboard({ netWorth, liquidWealth, assetsValue, liabilitiesValue, thisMonthStats, monthlyEvolution, visibleAccounts, accountBalances, visibleAssets, visibleLiabilities, members, activeMemberId, transactions, categories, fmt, memberShare, categoryAnalysis, anomalies, cashflowProjection, goals, wealthHistory = [], recurringGroups, currentMonth, setView }) {
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
      <div className="w-redesign min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-xl w-full">
          <div className="text-[10px] uppercase tracking-[0.2em] text-[var(--color-w-accent)] font-medium mb-4">Bienvenue chez Wealthly</div>
          <h1 className="text-[clamp(34px,5vw,52px)] leading-[1.05] font-medium tracking-[-0.04em] text-[var(--color-w-text)] mb-4">
            {activeMember ? `Bonjour ${activeMember.name}.` : 'Votre patrimoine,'}<br/>
            <span className="text-[var(--color-w-muted)]">consolidé en quelques minutes.</span>
          </h1>
          <p className="text-[var(--color-w-muted)] leading-relaxed mb-7 max-w-md">
            Importez vos relevés ou saisissez vos actifs. Tout reste chiffré, hébergé chez vous.
          </p>
          <div className="flex gap-3 flex-wrap">
            <button onClick={() => setView('import')} className="inline-flex items-center gap-2 px-5 h-11 rounded-[var(--radius-w-md)] bg-[var(--color-w-accent)] text-[#0a0a0c] font-medium hover:bg-[var(--color-w-accent-hover)] transition-colors">
              <Upload size={15}/> Importer un relevé
            </button>
            <button onClick={() => setView('wealth')} className="inline-flex items-center gap-2 px-5 h-11 rounded-[var(--radius-w-md)] border border-[var(--color-w-border-strong)] text-[var(--color-w-text)] hover:bg-[var(--color-w-surface-2)] transition-colors">
              <Plus size={14}/> Saisir un actif
            </button>
          </div>
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
      {/* Top bar: subtle greeting + utility actions only — no redundant page title */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5">
        <div className="text-[13px] text-[var(--color-w-faint)] font-medium tracking-tight">
          {greeting}{activeMember ? ` · ${activeMember.name}` : ''} <span className="text-[var(--color-w-faint)]/70">— {dateLong}</span>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {streak >= 2 && (
            <div className="inline-flex items-center gap-2 px-3 h-8 rounded-full border border-[var(--color-w-border)] bg-[var(--color-w-surface)] text-xs">
              <Zap size={12} className="text-[var(--color-w-accent)]"/>
              <span className="text-[var(--color-w-muted)]"><span className="text-[var(--color-w-text)] font-medium">{streak}</span> mois consécutifs</span>
            </div>
          )}
          <button
            onClick={async () => {
              const { generateBilanPdf } = await import('./pdfReport.js');
              generateBilanPdf({
                netWorth, liquidWealth, assetsValue, liabilitiesValue,
                thisMonthStats, monthlyEvolution,
                visibleAccounts, accountBalances, visibleAssets, visibleLiabilities,
                members, activeMemberId,
                recurringGroups, categoryAnalysis, categories,
                memberShare, currentMonth,
                ASSET_CLASS_MAP,
              });
            }}
            className="inline-flex items-center gap-2 px-3 h-8 rounded-md border border-[var(--color-w-border)] text-xs text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] hover:border-[var(--color-w-border-strong)] transition-colors"
            title="Télécharger le bilan en PDF"
          >
            <FileText size={12}/>
            <span>Bilan PDF</span>
          </button>
        </div>
      </div>

      {/* HERO — net worth giant + sparkline backdrop */}
      <section className="mb-4">
        <div className="relative overflow-hidden bg-[var(--color-w-surface)] border border-[var(--color-w-border)] rounded-[var(--radius-w-xl)] px-6 sm:px-10 pt-7 sm:pt-9 pb-7 sm:pb-9">
          {/* Subtle area sparkline behind the value */}
          {monthlyEvolution.length >= 2 && (
            <div className="absolute inset-x-0 bottom-0 h-[62%] pointer-events-none opacity-90" aria-hidden="true">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={monthlyEvolution.slice(-12)} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                  <defs>
                    <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-w-accent)" stopOpacity="0.18"/>
                      <stop offset="100%" stopColor="var(--color-w-accent)" stopOpacity="0"/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="balance" stroke="var(--color-w-accent)" strokeWidth={1.25} strokeOpacity={0.45} fill="url(#hero-area)"/>
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          <div className="relative">
            <div className="flex items-center gap-3 flex-wrap">
              <span className="text-[10px] uppercase tracking-[0.18em] text-[var(--color-w-muted)] font-medium">Patrimoine net</span>
              {perf.m1 !== null && (
                <span
                  className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2 py-0.5 rounded-md w-num"
                  style={{
                    color: m1Positive ? 'var(--color-w-success)' : 'var(--color-w-danger)',
                    background: m1Positive ? 'rgba(136,169,120,0.13)' : 'rgba(196,113,88,0.13)',
                  }}
                >
                  {m1Positive ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}
                  <span>{m1Positive ? '+' : ''}{perf.m1.toFixed(2)}%</span>
                  <span className="opacity-60 ml-0.5">1M</span>
                </span>
              )}
            </div>

            <div className="text-[clamp(46px,9.2vw,84px)] leading-[1.02] font-medium tracking-[-0.045em] w-num text-[var(--color-w-text)] mt-3">
              <AnimatedNumber value={netWorth} format={(v) => fmt(v)}/>
            </div>

            <div className="flex flex-wrap items-center gap-x-7 gap-y-2 mt-5 text-[13px]">
              {liquidWealth > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-w-asset-cash)]"/>
                  <span className="w-num text-[var(--color-w-text)]">{fmt(liquidWealth)}</span>
                  <span className="text-[var(--color-w-faint)]">liquidités</span>
                </span>
              )}
              {assetsValue > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-w-asset-equity)]"/>
                  <span className="w-num text-[var(--color-w-text)]">{fmt(assetsValue)}</span>
                  <span className="text-[var(--color-w-faint)]">actifs</span>
                </span>
              )}
              {liabilitiesValue > 0 && (
                <span className="inline-flex items-center gap-2">
                  <span className="inline-block w-1.5 h-1.5 rounded-full bg-[var(--color-w-danger)]"/>
                  <span className="w-num text-[var(--color-w-text)]">−{fmt(liabilitiesValue)}</span>
                  <span className="text-[var(--color-w-faint)]">dettes</span>
                </span>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Secondary KPI strip — 3 sober cards */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
        <div className={`${cardCls} px-5 py-4`}>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Performance 3 mois</span>
            {perf.m3 !== null && (perf.m3 >= 0 ? <TrendingUp size={14} className="text-[var(--color-w-success)]"/> : <TrendingDown size={14} className="text-[var(--color-w-danger)]"/>)}
          </div>
          <div className={`text-[22px] leading-tight font-medium w-num mt-2 ${perf.m3 === null ? 'text-[var(--color-w-faint)]' : perf.m3 >= 0 ? 'text-[var(--color-w-text)]' : 'text-[var(--color-w-danger)]'}`}>
            {perf.m3 !== null ? `${perf.m3 >= 0 ? '+' : ''}${perf.m3.toFixed(1)}%` : '—'}
          </div>
        </div>

        {liabilitiesValue > 0 ? (
          <div className={`${cardCls} px-5 py-4`}>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Ratio d'endettement</span>
              <CreditCard size={14} className="text-[var(--color-w-faint)]"/>
            </div>
            <div className="text-[22px] leading-tight font-medium w-num mt-2 text-[var(--color-w-text)]">
              {debtRatio !== null ? `${debtRatio.toFixed(1)}%` : '—'}
            </div>
            <div className="text-[11px] mt-1 uppercase tracking-wider">
              {debtRatio === null ? null : debtRatio < 30 ? (
                <span className="text-[var(--color-w-success)]">Sain</span>
              ) : debtRatio < 50 ? (
                <span className="text-[var(--color-w-warning)]">Surveillé</span>
              ) : (
                <span className="text-[var(--color-w-danger)]">Élevé</span>
              )}
            </div>
          </div>
        ) : (
          <div className={`${cardCls} px-5 py-4`}>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Épargne du mois</span>
              <PiggyBank size={14} className="text-[var(--color-w-faint)]"/>
            </div>
            <div className={`text-[22px] leading-tight font-medium w-num mt-2 ${thisMonthStats.net >= 0 ? 'text-[var(--color-w-text)]' : 'text-[var(--color-w-danger)]'}`}>
              <AnimatedNumber value={thisMonthStats.net} format={(v) => fmt(v, { sign: true })}/>
            </div>
            {thisMonthStats.income > 0 && (
              <div className="text-[11px] text-[var(--color-w-faint)] mt-1 w-num">{((thisMonthStats.net / thisMonthStats.income) * 100).toFixed(0)}% des revenus</div>
            )}
          </div>
        )}

        <div className={`${cardCls} px-5 py-4`}>
          <div className="flex items-center justify-between">
            <span className={labelCls}>Part liquide</span>
            <Wallet size={14} className="text-[var(--color-w-faint)]"/>
          </div>
          <div className="text-[22px] leading-tight font-medium w-num mt-2 text-[var(--color-w-text)]">
            {liquidityRatio !== null ? `${liquidityRatio.toFixed(0)}%` : '—'}
          </div>
          <div className="text-[11px] text-[var(--color-w-faint)] mt-1">disponibles immédiatement</div>
        </div>
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

      {/* Net worth chart — Finary-style brut/net/financier toggle + period selector */}
      <section className={`${cardCls} p-6 mb-5`}>
        <NetWorthChart snapshots={wealthHistory} fmt={fmt}/>
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

    </div>
  );
}
// ============================================================================
// MONTHLY (Suivi Mensuel)
// ============================================================================
function Monthly({ transactions, accounts, categories, members, recurringIds, recurringGroups, monthlyEvolution, thisMonthStats, anomalies, categoryAnalysis, fixedCharges, saveFixedCharge, deleteFixedCharge, memberShare, currentMonth, fmt }) {
  const [selectedMonth, setSelectedMonth] = useState(currentMonth);
  const [editingCharge, setEditingCharge] = useState(null);

  const availableMonths = useMemo(() => {
    const set = new Set(monthlyEvolution.map(m => m.month));
    set.add(currentMonth);
    return Array.from(set).sort((a, b) => b.localeCompare(a));
  }, [monthlyEvolution, currentMonth]);
  const monthData = useMemo(() => monthlyEvolution.find(m => m.month === selectedMonth) || { income: 0, expenses: 0, net: 0, fixed: 0, variable: 0, savings: 0 }, [monthlyEvolution, selectedMonth]);
  const isCurrentMonth = selectedMonth === currentMonth;

  // Active fixed charges for the selected month (start_month <= selectedMonth <= end_month)
  const activeFixedCharges = useMemo(() => {
    return (fixedCharges || []).filter(fc => {
      if (fc.start_month && selectedMonth < fc.start_month) return false;
      if (fc.end_month && selectedMonth > fc.end_month) return false;
      return true;
    });
  }, [fixedCharges, selectedMonth]);

  const totalFixedCharges = activeFixedCharges.reduce((s, fc) => s + (fc.amount || 0), 0);

  // Group fixed charges by category for the detail card
  const fixedByCategory = useMemo(() => {
    const groups = {};
    activeFixedCharges.forEach(fc => {
      const slug = fc.category_slug || 'other';
      const cat = categories.find(c => c.slug === slug || c.id === slug);
      if (!groups[slug]) groups[slug] = { category: cat, slug, total: 0, items: [] };
      groups[slug].total += fc.amount || 0;
      groups[slug].items.push(fc);
    });
    return Object.values(groups).sort((a, b) => b.total - a.total);
  }, [activeFixedCharges, categories]);

  // Subscriptions = fixed charges with the subscriptions category, surfaced separately
  // to encourage spotting potential savings.
  const subscriptionCharges = useMemo(() => {
    return activeFixedCharges
      .filter(fc => (fc.category_slug || '').toLowerCase() === 'subscriptions')
      .sort((a, b) => (b.amount || 0) - (a.amount || 0));
  }, [activeFixedCharges]);
  const subscriptionsTotal = subscriptionCharges.reduce((s, fc) => s + (fc.amount || 0), 0);

  // Selected month transactions, used for variable spend computation
  const monthTransactions = useMemo(() => {
    return transactions.filter(t => monthKey(t.date) === selectedMonth)
      .map(t => {
        const acc = accounts.find(a => a.id === t.accountId);
        const share = acc ? memberShare(acc) : 1;
        return { ...t, sharedAmount: t.amount * share, isRecurring: recurringIds.has(t.id) };
      });
  }, [transactions, selectedMonth, accounts, recurringIds, memberShare]);

  // Variable spend = all expenses NOT covered by a fixed charge.
  // We use detected-recurring as a proxy here; once a charge fixe is registered
  // explicitly, the user can mark its txs as recurring to keep them out.
  const variableSpent = monthTransactions
    .filter(t => t.amount < 0 && !t.isRecurring)
    .reduce((s, t) => s + Math.abs(t.sharedAmount), 0);

  // Hero numbers
  const restToLive = Math.max(0, monthData.income - totalFixedCharges);
  const restAvailable = restToLive - variableSpent;
  const restPct = restToLive > 0 ? Math.min(100, (variableSpent / restToLive) * 100) : 0;
  const savingsRate = monthData.income > 0 ? (monthData.net / monthData.income) * 100 : null;

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

  const expenseCategories = categories.filter(c => c.type === 'expense');

  const startEdit = (charge) => {
    setEditingCharge(charge || {
      name: '', amount: '', day_of_month: 1, category_slug: 'subscriptions',
      start_month: selectedMonth, end_month: null, member_ids: [], notes: '',
    });
  };

  return (
    <div className="monthly-view">
      <div className="monthly-header">
        <select className="month-selector" value={selectedMonth} onChange={(e) => setSelectedMonth(e.target.value)}>
          {availableMonths.map(m => (
            <option key={m} value={m}>{formatDate(m + '-01', { format: 'monthLong' })}{m === currentMonth ? ' (en cours)' : ''}</option>
          ))}
        </select>
      </div>

      {/* Hero — Reste à vivre */}
      <section className="card rest-hero">
        <div className="rest-hero-top">
          <div>
            <div className="rest-hero-label">Reste à vivre ce mois</div>
            <div className={`rest-hero-value ${restToLive >= 0 ? 'positive' : 'negative'}`}>
              <AnimatedNumber value={restToLive} format={(v) => fmt(v)}/>
            </div>
            <div className="rest-hero-formula">
              {fmt(monthData.income)} de revenus − {fmt(totalFixedCharges)} de charges fixes
            </div>
          </div>
          <div className="rest-hero-stats">
            <div className="rest-stat">
              <span className="rest-stat-label">Déjà dépensé en variable</span>
              <span className="rest-stat-value">{fmt(variableSpent)}</span>
            </div>
            <div className="rest-stat">
              <span className="rest-stat-label">Encore disponible</span>
              <span className={`rest-stat-value ${restAvailable >= 0 ? 'positive' : 'negative'}`}>{fmt(restAvailable, { sign: true })}</span>
            </div>
          </div>
        </div>
        <div className="rest-bar">
          <div className="rest-bar-fill" style={{ width: `${restPct}%`, background: restPct < 80 ? 'var(--success)' : restPct < 100 ? 'var(--warning)' : 'var(--danger)' }}/>
        </div>
        <div className="rest-bar-meta">
          <span>{restPct.toFixed(0)}% du reste à vivre consommé</span>
          {savingsRate !== null && (
            <span>Taux d'épargne : <strong className={savingsRate >= 20 ? 'positive' : savingsRate >= 10 ? '' : 'negative'}>{savingsRate.toFixed(1)}%</strong></span>
          )}
        </div>
      </section>

      {/* Charges fixes en détail */}
      <section className="card">
        <div className="card-header">
          <h3><Repeat size={16}/> Mes charges fixes</h3>
          <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
            <span className="card-meta">{activeFixedCharges.length} charge{activeFixedCharges.length > 1 ? 's' : ''} · {fmt(totalFixedCharges)}/mois</span>
            <button className="secondary-btn" onClick={() => startEdit(null)}><Plus size={14}/> Ajouter</button>
          </div>
        </div>
        {activeFixedCharges.length === 0 ? (
          <div className="empty-mini">
            <Repeat size={24}/>
            <p>Ajoute tes charges fixes (loyer, EDF, abonnements, assurances…) pour calculer ton reste à vivre.</p>
          </div>
        ) : (
          <div className="fixed-by-cat">
            {fixedByCategory.map(group => (
              <div key={group.slug} className="fixed-cat-group">
                <div className="fixed-cat-header">
                  <span className="fixed-cat-icon" style={{ background: (group.category?.color || '#999') + '22', color: group.category?.color }}>
                    {group.category?.icon || '📌'}
                  </span>
                  <span className="fixed-cat-name">{group.category?.name || 'Autres'}</span>
                  <span className="fixed-cat-total">{fmt(group.total)}</span>
                </div>
                <div className="fixed-cat-items">
                  {group.items.map(it => (
                    <div key={it.id} className="fixed-item">
                      <div className="fixed-item-day">{it.day_of_month ? `J${it.day_of_month}` : '—'}</div>
                      <div className="fixed-item-info">
                        <strong>{it.name}</strong>
                        {it.end_month && <span className="fixed-item-meta">stop {it.end_month}</span>}
                      </div>
                      <div className="fixed-item-amount">{fmt(it.amount)}</div>
                      <button className="icon-btn-sm" onClick={() => startEdit(it)} title="Modifier"><Edit3 size={13}/></button>
                      <button className="icon-btn-sm" onClick={() => deleteFixedCharge(it.id)} title="Supprimer"><Trash2 size={13}/></button>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* Subscriptions spotlight — help spot savings */}
      {subscriptionCharges.length > 0 && (
        <section className="card">
          <div className="card-header">
            <h3><Sparkles size={16}/> Tes abonnements</h3>
            <span className="card-meta">{subscriptionCharges.length} actif{subscriptionCharges.length > 1 ? 's' : ''} · {fmt(subscriptionsTotal)}/mois · {fmt(subscriptionsTotal * 12)}/an</span>
          </div>
          <div className="subs-list">
            {subscriptionCharges.map(s => (
              <div key={s.id} className="subs-row">
                <div className="subs-name">{s.name}</div>
                <div className="subs-amount">
                  <span>{fmt(s.amount)}/mois</span>
                  <span className="subs-yearly">{fmt(s.amount * 12)}/an</span>
                </div>
                <button className="icon-btn-sm" onClick={() => startEdit(s)} title="Modifier"><Edit3 size={13}/></button>
              </div>
            ))}
          </div>
          <div className="settings-info" style={{ marginTop: 12 }}>
            <Lightbulb size={14}/>
            <span>Vérifie chaque trimestre les abonnements que tu n'utilises plus — gym, streaming, app store. Souvent 20-30€/mois passent inaperçus.</span>
          </div>
        </section>
      )}

      {/* Anomalies for selected month */}
      {isCurrentMonth && anomalies.length > 0 && (
        <section className="card alert-card">
          <div className="card-header">
            <h3><AlertTriangle size={16} style={{ color: 'var(--warning)' }}/> Anomalies détectées</h3>
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

      {/* Compact KPIs */}
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
            <div className="mk-value"><AnimatedNumber value={totalFixedCharges} format={(v) => fmt(v)}/></div>
          </div>
        </div>
        <div className="mk-card variable">
          <div className="mk-icon"><Activity size={18}/></div>
          <div className="mk-info">
            <div className="mk-label">Dépenses variables</div>
            <div className="mk-value"><AnimatedNumber value={variableSpent} format={(v) => fmt(v)}/></div>
          </div>
        </div>
        <div className={`mk-card net ${monthData.net >= 0 ? 'positive' : 'negative'}`}>
          <div className="mk-icon">{monthData.net >= 0 ? <ArrowUp size={18}/> : <ArrowDown size={18}/>}</div>
          <div className="mk-info">
            <div className="mk-label">Solde net</div>
            <div className="mk-value"><AnimatedNumber value={monthData.net} format={(v) => fmt(v, { sign: true })}/></div>
          </div>
        </div>
      </section>

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

      {/* Income vs Expenses 6 month chart */}
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
              <Bar dataKey="income" name="Revenus" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={24}/>
              <Bar dataKey="expenses" name="Dépenses" fill="var(--danger)" radius={[3, 3, 0, 0]} maxBarSize={24}/>
              <Line type="monotone" dataKey="net" name="Solde net" stroke="var(--primary)" strokeWidth={1.75} dot={{ r: 2.5, fill: 'var(--primary)' }} activeDot={{ r: 4 }}/>
            </ComposedChart>
          </ResponsiveContainer>
        ) : <div className="chart-empty"><BarChart3 size={28}/><span>Pas encore de données</span></div>}
      </section>

      {editingCharge && (
        <FixedChargeEditor
          charge={editingCharge}
          categories={expenseCategories}
          members={members}
          currentMonth={currentMonth}
          onSave={(c) => { saveFixedCharge(c); setEditingCharge(null); }}
          onCancel={() => setEditingCharge(null)}
        />
      )}
    </div>
  );
}

function FixedChargeEditor({ charge, categories, members, currentMonth, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    id: charge.id || null,
    name: charge.name || '',
    amount: charge.amount ?? '',
    day_of_month: charge.day_of_month || 1,
    category_slug: charge.category_slug || 'subscriptions',
    start_month: charge.start_month || currentMonth,
    end_month: charge.end_month || '',
    notes: charge.notes || '',
    member_ids: charge.member_ids || [],
  });
  const submit = () => {
    if (!draft.name.trim() || !draft.amount) return;
    onSave({
      ...draft,
      amount: parseFloat(draft.amount),
      end_month: draft.end_month || null,
    });
  };
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{draft.id ? 'Modifier la charge fixe' : 'Nouvelle charge fixe'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label><span>Nom</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} placeholder="Loyer, EDF, Netflix…"/></label>
          <label><span>Montant mensuel (€)</span><input type="number" step="0.01" value={draft.amount} onChange={(e) => setDraft({ ...draft, amount: e.target.value })}/></label>
          <label><span>Jour du mois</span>
            <input type="number" min={1} max={31} value={draft.day_of_month} onChange={(e) => setDraft({ ...draft, day_of_month: parseInt(e.target.value, 10) || 1 })}/>
          </label>
          <label><span>Catégorie</span>
            <select value={draft.category_slug} onChange={(e) => setDraft({ ...draft, category_slug: e.target.value })}>
              {categories.map(c => <option key={c.slug || c.id} value={c.slug || c.id}>{c.icon} {c.name}</option>)}
            </select>
          </label>
          <label><span>Actif depuis</span>
            <input type="month" value={draft.start_month} onChange={(e) => setDraft({ ...draft, start_month: e.target.value })}/>
          </label>
          <label><span>Actif jusqu'à (optionnel)</span>
            <input type="month" value={draft.end_month} onChange={(e) => setDraft({ ...draft, end_month: e.target.value })}/>
          </label>
          {members && members.length > 0 && (
            <label><span>Membres concernés</span>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 4 }}>
                {members.map(m => {
                  const checked = draft.member_ids.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      className={`secondary-btn ${checked ? 'active' : ''}`}
                      style={{ borderColor: checked ? 'var(--primary)' : undefined }}
                      onClick={() => setDraft({
                        ...draft,
                        member_ids: checked ? draft.member_ids.filter(x => x !== m.id) : [...draft.member_ids, m.id],
                      })}
                    >{m.name}</button>
                  );
                })}
              </div>
            </label>
          )}
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <button className="primary-btn" onClick={submit}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// BUDGETS (revamped)
// ============================================================================
// ============================================================================
// CASHFLOW (Sankey diagram — inspired by Finary's Budget view)
// ============================================================================
function Cashflow({ transactions, categories, accounts, memberShare, fmt, currentMonth }) {
  const [period, setPeriod] = useState('1M'); // 1M | 3M | 1A
  const [anchor, setAnchor] = useState(currentMonth); // YYYY-MM the period ends on (inclusive)
  const isNarrow = useIsNarrow(760);

  const monthsInPeriod = period === '1M' ? 1 : period === '3M' ? 3 : 12;

  // Build the [start, end] window
  const { startKey, endKey } = useMemo(() => {
    const [y, m] = anchor.split('-').map(Number);
    const endDate = new Date(y, m - 1, 1);
    const startDate = new Date(y, m - 1 - (monthsInPeriod - 1), 1);
    const sk = `${startDate.getFullYear()}-${String(startDate.getMonth() + 1).padStart(2, '0')}`;
    return { startKey: sk, endKey: anchor };
  }, [anchor, monthsInPeriod]);

  // Filter and aggregate
  const filtered = useMemo(() => {
    return transactions.filter(t => {
      const k = monthKey(t.date);
      return k >= startKey && k <= endKey;
    }).map(t => {
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      return { ...t, sharedAmount: t.amount * share };
    });
  }, [transactions, startKey, endKey, accounts, memberShare]);

  // Group by category
  const incomeByCat = {};
  const expenseByCat = {};
  filtered.forEach(t => {
    const slug = t.categoryId || 'uncategorized';
    if (t.amount >= 0) {
      incomeByCat[slug] = (incomeByCat[slug] || 0) + t.sharedAmount;
    } else {
      expenseByCat[slug] = (expenseByCat[slug] || 0) + Math.abs(t.sharedAmount);
    }
  });
  const totalIncome = Object.values(incomeByCat).reduce((s, v) => s + v, 0);
  const totalExpense = Object.values(expenseByCat).reduce((s, v) => s + v, 0);
  const available = totalIncome - totalExpense;

  // Sort categories by amount descending
  const incomeEntries = Object.entries(incomeByCat).sort((a, b) => b[1] - a[1]);
  const expenseEntries = Object.entries(expenseByCat).sort((a, b) => b[1] - a[1]);

  const catFor = (slug) => categories.find(c => c.slug === slug || c.id === slug);

  // Build Sankey data
  const sankeyData = useMemo(() => {
    if (totalIncome === 0 && totalExpense === 0) return null;
    const nodes = [];
    const links = [];
    // Income nodes (left)
    incomeEntries.forEach(([slug, value]) => {
      const cat = catFor(slug);
      nodes.push({ name: cat?.name || slug, kind: 'income', value, color: cat?.color || 'var(--success)' });
    });
    // Hub
    const hubIdx = nodes.length;
    nodes.push({ name: 'Disponible', kind: 'hub' });
    // Expense nodes (right)
    expenseEntries.forEach(([slug, value]) => {
      const cat = catFor(slug);
      nodes.push({ name: cat?.name || slug, kind: 'expense', value, color: cat?.color || 'var(--danger)' });
    });
    // Surplus (épargne) node if income > expense
    let surplusIdx = null;
    if (available > 0) {
      surplusIdx = nodes.length;
      nodes.push({ name: 'Épargne', kind: 'savings', value: available, color: 'var(--primary)' });
    }
    // Links: income → hub, hub → expense / savings
    incomeEntries.forEach((_, i) => {
      links.push({ source: i, target: hubIdx, value: incomeEntries[i][1] });
    });
    expenseEntries.forEach((_, i) => {
      const idx = hubIdx + 1 + i;
      links.push({ source: hubIdx, target: idx, value: expenseEntries[i][1] });
    });
    if (surplusIdx !== null) {
      links.push({ source: hubIdx, target: surplusIdx, value: available });
    }
    return { nodes, links };
  // eslint-disable-next-line
  }, [incomeByCat, expenseByCat, available, totalIncome, totalExpense, categories]);

  // Distribution donut data — expense categories
  const donutData = expenseEntries.map(([slug, value]) => {
    const cat = catFor(slug);
    return { name: cat?.name || slug, value, color: cat?.color || '#999' };
  });

  // Period navigation
  const shiftAnchor = (delta) => {
    const [y, m] = anchor.split('-').map(Number);
    const d = new Date(y, m - 1 + delta, 1);
    setAnchor(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`);
  };

  const periodLabel = period === '1M'
    ? formatDate(anchor + '-01', { format: 'monthLong' })
    : `${formatDate(startKey + '-01', { format: 'monthYear' })} → ${formatDate(anchor + '-01', { format: 'monthYear' })}`;

  return (
    <div className="cashflow-view">
      <div className="cashflow-period">
        <div className="cashflow-period-nav">
          <button className="icon-btn" onClick={() => shiftAnchor(-1)} title="Période précédente"><ChevronLeft size={16}/></button>
          <span className="cashflow-period-label">{periodLabel}</span>
          <button className="icon-btn" onClick={() => shiftAnchor(1)} title="Période suivante"
            disabled={anchor >= currentMonth}><ChevronRight size={16}/></button>
        </div>
        <div className="nw-toggle-group">
          {['1M', '3M', '1A'].map(p => (
            <button key={p} className={period === p ? 'active' : ''} onClick={() => setPeriod(p)}>{p}</button>
          ))}
        </div>
      </div>

      <div className="cashflow-grid">
        <section className="card cashflow-sankey-card">
          <div className="card-header">
            <h3>Flux d'argent</h3>
            <span className="card-meta">{filtered.length} transaction{filtered.length > 1 ? 's' : ''} sur la période</span>
          </div>
          {sankeyData ? (
            <ResponsiveContainer width="100%" height={isNarrow ? 520 : 420}>
              <Sankey
                data={sankeyData}
                nodePadding={isNarrow ? 16 : 28}
                nodeWidth={isNarrow ? 8 : 12}
                linkCurvature={0.5}
                iterations={64}
                node={<SankeyNode narrow={isNarrow}/>}
                link={{ stroke: 'var(--border)', strokeOpacity: 0.4, fill: 'var(--primary-soft)' }}
                margin={isNarrow ? { top: 8, right: 70, bottom: 8, left: 70 } : { top: 12, right: 180, bottom: 12, left: 180 }}
              >
                <Tooltip
                  formatter={(v) => fmt(v)}
                  contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                />
              </Sankey>
            </ResponsiveContainer>
          ) : (
            <div className="empty-mini" style={{ padding: '60px 0' }}>
              <Activity size={28}/>
              <p>Aucune transaction sur cette période. Importe un CSV ou change de mois.</p>
            </div>
          )}

          <div className="cashflow-kpi-row">
            <div className="cashflow-kpi">
              <div className="cashflow-kpi-label">Entrées</div>
              <div className="cashflow-kpi-value positive">+{fmt(totalIncome)}</div>
            </div>
            <div className="cashflow-kpi">
              <div className="cashflow-kpi-label">Sorties</div>
              <div className="cashflow-kpi-value negative">−{fmt(totalExpense)}</div>
            </div>
            <div className="cashflow-kpi">
              <div className="cashflow-kpi-label">Disponible</div>
              <div className={`cashflow-kpi-value ${available >= 0 ? 'positive' : 'negative'}`}>{available >= 0 ? '+' : ''}{fmt(available)}</div>
            </div>
          </div>
        </section>

        <section className="card cashflow-distribution-card">
          <div className="card-header"><h3>Distribution</h3></div>
          {donutData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie data={donutData} dataKey="value" cx="50%" cy="50%" innerRadius={62} outerRadius={92} paddingAngle={2} stroke="none">
                    {donutData.map((d, i) => <Cell key={i} fill={d.color}/>)}
                  </Pie>
                  <Tooltip formatter={(v) => fmt(v)} contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}/>
                </PieChart>
              </ResponsiveContainer>
              <div className="cashflow-donut-center">
                <span className="cashflow-donut-label">Somme sorties</span>
                <span className="cashflow-donut-value negative">−{fmt(totalExpense)}</span>
              </div>
            </>
          ) : (
            <div className="empty-mini"><Activity size={20}/><p>Pas encore de dépenses.</p></div>
          )}
        </section>
      </div>

      <div className="cashflow-cats-grid">
        <section className="card">
          <div className="card-header">
            <h3>Entrées</h3>
            <span className="card-meta">{incomeEntries.length} catégorie{incomeEntries.length > 1 ? 's' : ''}</span>
          </div>
          {incomeEntries.length === 0 ? (
            <div className="empty-mini"><p>Aucune entrée sur la période.</p></div>
          ) : (
            <div className="cashflow-cat-list">
              {incomeEntries.map(([slug, value]) => {
                const cat = catFor(slug);
                const pct = totalIncome > 0 ? (value / totalIncome) * 100 : 0;
                return (
                  <div key={slug} className="cashflow-cat-row">
                    <span className="cashflow-cat-icon" style={{ background: (cat?.color || '#999') + '22', color: cat?.color }}>{cat?.icon || '💰'}</span>
                    <div className="cashflow-cat-info">
                      <div className="cashflow-cat-name">{cat?.name || slug}</div>
                      <div className="cashflow-cat-meta">{pct.toFixed(0)} % des entrées</div>
                    </div>
                    <div className="cashflow-cat-amount positive">+{fmt(value)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>

        <section className="card">
          <div className="card-header">
            <h3>Sorties</h3>
            <span className="card-meta">{expenseEntries.length} catégorie{expenseEntries.length > 1 ? 's' : ''}</span>
          </div>
          {expenseEntries.length === 0 ? (
            <div className="empty-mini"><p>Aucune sortie sur la période.</p></div>
          ) : (
            <div className="cashflow-cat-list">
              {expenseEntries.map(([slug, value]) => {
                const cat = catFor(slug);
                const pct = totalExpense > 0 ? (value / totalExpense) * 100 : 0;
                return (
                  <div key={slug} className="cashflow-cat-row">
                    <span className="cashflow-cat-icon" style={{ background: (cat?.color || '#999') + '22', color: cat?.color }}>{cat?.icon || '💸'}</span>
                    <div className="cashflow-cat-info">
                      <div className="cashflow-cat-name">{cat?.name || slug}</div>
                      <div className="cashflow-cat-meta">{pct.toFixed(0)} % des sorties</div>
                    </div>
                    <div className="cashflow-cat-amount negative">−{fmt(value)}</div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

// Custom Sankey node — colored bar with label outside the diagram
const SankeyNode = React.memo(function SankeyNode({ x, y, width, height, index, payload, narrow }) {
  const isLeft = payload.kind === 'income';
  const color = payload.color || (payload.kind === 'hub' ? 'var(--primary)' : payload.kind === 'savings' ? 'var(--primary)' : payload.kind === 'income' ? 'var(--success)' : 'var(--danger)');
  const labelOffset = narrow ? 5 : 8;
  const fontSize = narrow ? 10 : 12;
  const valueLabel = payload.value ? Math.round(payload.value).toLocaleString('fr-FR') + ' €' : '';
  // On narrow viewports the sankey margins are tight (~70px each side), so we
  // drop the value suffix from labels to keep them readable.
  const labelText = narrow ? payload.name : `${payload.name}${valueLabel ? ` · ${valueLabel}` : ''}`;
  return (
    <Layer key={`node-${index}`}>
      <Rectangle x={x} y={y} width={width} height={height} fill={color} fillOpacity={payload.kind === 'hub' ? 0.9 : 0.75} stroke="none"/>
      {payload.kind !== 'hub' && (
        <text
          textAnchor={isLeft ? 'end' : 'start'}
          x={isLeft ? x - labelOffset : x + width + labelOffset}
          y={y + height / 2}
          dy={4}
          fontSize={fontSize}
          fill="var(--text-primary)"
        >
          {labelText}
        </text>
      )}
      {payload.kind === 'hub' && (
        <text
          textAnchor="middle"
          x={x + width / 2}
          y={y - 8}
          fontSize={11}
          fill="var(--text-tertiary)"
        >
          Disponible
        </text>
      )}
    </Layer>
  );
});

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
                      {pct > 80 && pct < 100 && <span className="budget-warning">Bientôt dépassé</span>}
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
                    {progress >= 100 && <span className="goal-complete">Atteint</span>}
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
// Map of wealth sub-views to the asset types they include.
// 'all' shows everything (the current Patrimoine page); others narrow the
// view to a Finary-style class detail.
const WEALTH_SUBVIEWS = [
  { key: 'all',         label: 'Tout',         types: null,                                icon: BarChart3 },
  { key: 'real_estate', label: 'Immobilier',   types: ['real_estate'],                     icon: Home },
  { key: 'equities',    label: 'Actions & Fonds', types: ['pea', 'stocks'],                icon: Landmark },
  { key: 'crypto',      label: 'Crypto',       types: ['crypto'],                          icon: Bitcoin },
  { key: 'savings',     label: 'Épargne',      types: ['savings_account', 'life_insurance'], icon: PiggyBank },
  { key: 'retirement',  label: 'Retraite',     types: ['per'],                             icon: Target },
  { key: 'liabilities', label: 'Emprunts',     types: [],                                  icon: CreditCard },
  { key: 'other',       label: 'Autres actifs', types: ['other_asset'],                    icon: Coins },
];

function Wealth({ assets, liabilities, members, activeMemberId, visibleAssets, visibleLiabilities, saveAsset, deleteAsset, saveLiability, deleteLiability, memberShare, fmt, wealthHistory = [] }) {
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLia, setEditingLia] = useState(null);
  const [viewingLia, setViewingLia] = useState(null);
  const [subview, setSubview] = useState('all');
  const [showAddPicker, setShowAddPicker] = useState(false);

  const currentSub = WEALTH_SUBVIEWS.find(s => s.key === subview) || WEALTH_SUBVIEWS[0];
  const isAll = subview === 'all';
  const isLiabilitiesOnly = subview === 'liabilities';

  // Apply the subview filter to assets
  const filteredAssets = useMemo(() => {
    if (isAll || isLiabilitiesOnly) return visibleAssets;
    if (!currentSub.types) return visibleAssets;
    return visibleAssets.filter(a => currentSub.types.includes(a.type));
  }, [visibleAssets, currentSub.types, isAll, isLiabilitiesOnly]);
  const filteredLiabilities = isAll || isLiabilitiesOnly ? visibleLiabilities : [];

  const assetsByType = useMemo(() => {
    const groups = {};
    filteredAssets.forEach(a => {
      if (!groups[a.type]) groups[a.type] = [];
      groups[a.type].push(a);
    });
    return groups;
  }, [filteredAssets]);

  const subviewTotal = filteredAssets.reduce((s, a) => s + (parseFloat(a.currentValue) || 0) * memberShare(a), 0);
  const subviewLiabTotal = filteredLiabilities.reduce((s, l) => s + (parseFloat(l.remainingCapital) || 0) * memberShare(l), 0);

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
          <p className="page-subtitle">Actifs, passifs, allocation par classe.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAddPicker(true)}><Plus size={14}/> Compléter mon patrimoine</button>
      </div>

      <nav className="wealth-subnav">
        {WEALTH_SUBVIEWS.map(s => {
          const Icon = s.icon;
          let count = 0;
          if (s.key === 'all') count = visibleAssets.length + visibleLiabilities.length;
          else if (s.key === 'liabilities') count = visibleLiabilities.length;
          else if (s.types) count = visibleAssets.filter(a => s.types.includes(a.type)).length;
          return (
            <button
              key={s.key}
              className={`wealth-subnav-btn ${subview === s.key ? 'active' : ''}`}
              onClick={() => setSubview(s.key)}
            >
              <Icon size={14}/>
              <span>{s.label}</span>
              {count > 0 && <span className="wealth-subnav-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      {/* Subview header (when not 'all') */}
      {!isAll && (
        <section className="card subview-hero">
          <div className="subview-hero-info">
            <div className="subview-hero-label">{currentSub.label}</div>
            <div className="subview-hero-value">{fmt(isLiabilitiesOnly ? subviewLiabTotal : subviewTotal)}</div>
            <div className="subview-hero-meta">
              {isLiabilitiesOnly
                ? `${filteredLiabilities.length} prêt${filteredLiabilities.length > 1 ? 's' : ''} · ${fmt(visibleLiabilities.reduce((s, l) => s + (parseFloat(l.monthlyPayment) || 0) * memberShare(l), 0))} / mois`
                : `${filteredAssets.length} actif${filteredAssets.length > 1 ? 's' : ''} · ${totalAssets > 0 ? ((subviewTotal / totalAssets) * 100).toFixed(0) : 0}% du patrimoine`}
            </div>
          </div>
        </section>
      )}

      {/* Patrimoine history with brut / net / financier toggle */}
      {isAll && wealthHistory.length >= 1 && (
        <section className="card chart-card">
          <NetWorthChart snapshots={wealthHistory} fmt={fmt}/>
        </section>
      )}

      {/* Private wealth KPI strip */}
      {isAll && totalAssets > 0 && (
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
              <div className="wk-meta">{debtRatioWealth < 30 ? 'Faible' : debtRatioWealth < 50 ? 'Modéré' : 'Élevé'}</div>
            </div>
          )}
          {illiquidRatio !== null && (
            <div className="wk-card">
              <div className="wk-label">Part immobilier</div>
              <div className="wk-value">{illiquidRatio.toFixed(1)}%</div>
              <div className="wk-meta">{illiquidRatio > 70 ? 'Peu diversifié' : 'Équilibré'}</div>
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

      {/* Asset class allocation — only on 'all' */}
      {isAll && classAllocation.length > 0 && (
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

      {isAll && (
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
      )}

      {!isLiabilitiesOnly && (
      <section className="card">
        <div className="card-header">
          <h3><Wallet size={16}/> {isAll ? 'Actifs' : currentSub.label}</h3>
          <button className="secondary-btn" onClick={() => setEditingAsset({ id: null, type: currentSub.types?.[0] || 'real_estate', name: '', currentValue: 0, memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', updatedAt: new Date().toISOString() })}>
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
      )}

      {(isAll || isLiabilitiesOnly) && (
      <section className="card">
        <div className="card-header">
          <h3><CreditCard size={16}/> Prêts en cours</h3>
          <button className="secondary-btn" onClick={() => setEditingLia({ id: null, type: 'mortgage', name: '', initialCapital: '', remainingCapital: '', monthlyPayment: '', interestRate: '', endDate: '', memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', downPayment: '', insuranceRate: '', applicationFees: '', ownershipPct: 100, durationMonths: '', startDate: '', linkedAssetId: '' })}>
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
                <div key={l.id} className="liability-card-v2 clickable" onClick={() => setViewingLia(l)}>
                  <div className="lia-header">
                    <div className="lia-icon" style={{ background: type.color + '22', color: type.color }}><Icon size={14}/></div>
                    <div className="lia-name-block">
                      <span className="lia-name">{l.name}</span>
                      <span className="lia-type">{type.name}</span>
                    </div>
                    <div className="lia-actions" onClick={(e) => e.stopPropagation()}>
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
      )}

      {editingAsset && <AssetEditor asset={editingAsset} members={members} liabilities={visibleLiabilities} onSave={(a) => { saveAsset(a); setEditingAsset(null); }} onCancel={() => setEditingAsset(null)}/>}
      {editingLia && <LiabilityEditor liability={editingLia} members={members} assets={assets} onSave={(l) => { saveLiability(l); setEditingLia(null); }} onCancel={() => setEditingLia(null)}/>}
      {viewingLia && <LiabilityDetail liability={viewingLia} assets={assets} members={members} memberShare={memberShare} fmt={fmt} onEdit={() => { setEditingLia(viewingLia); setViewingLia(null); }} onClose={() => setViewingLia(null)}/>}
      {showAddPicker && (
        <CompletePatrimoinePicker
          onClose={() => setShowAddPicker(false)}
          onPickAsset={(typeId) => {
            setShowAddPicker(false);
            setEditingAsset({ id: null, type: typeId, name: '', currentValue: 0, memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', updatedAt: new Date().toISOString() });
          }}
          onPickLiability={() => {
            setShowAddPicker(false);
            setEditingLia({ id: null, type: 'mortgage', name: '', initialCapital: '', remainingCapital: '', monthlyPayment: '', interestRate: '', endDate: '', memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', downPayment: '', insuranceRate: '', applicationFees: '', ownershipPct: 100, durationMonths: '', startDate: '', linkedAssetId: '' });
          }}
        />
      )}
    </div>
  );
}

function CompletePatrimoinePicker({ onClose, onPickAsset, onPickLiability }) {
  const [filter, setFilter] = useState('');
  const items = [
    ...ASSET_TYPES.map(t => ({ kind: 'asset', id: t.id, name: t.name, description: t.description, icon: t.icon, color: t.color })),
    { kind: 'liability', id: 'mortgage', name: 'Crédit / Emprunt', description: 'Crédit immo, conso, auto…', icon: CreditCard, color: '#7c2d12' },
  ];
  const filtered = items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) || i.description.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Compléter mon patrimoine</h2>
          <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label>
            <span>Rechercher</span>
            <input autoFocus type="text" placeholder="Immobilier, PEA, Crypto, Crédit…" value={filter} onChange={(e) => setFilter(e.target.value)}/>
          </label>
          <div className="patrimoine-picker-grid">
            {filtered.map((it, i) => {
              const Icon = it.icon;
              const onClick = () => it.kind === 'asset' ? onPickAsset(it.id) : onPickLiability();
              return (
                <button key={i} className="patrimoine-picker-card" onClick={onClick}>
                  <div className="ppc-icon" style={{ background: it.color + '22', color: it.color }}><Icon size={20}/></div>
                  <div className="ppc-text">
                    <div className="ppc-name">{it.name}</div>
                    <div className="ppc-desc">{it.description}</div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>Aucun résultat.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetEditor({ asset, members, liabilities = [], onSave, onCancel }) {
  // Real-estate gets the multi-step wizard; the rest stays the lighter form.
  if (asset.type === 'real_estate') {
    return <RealEstateEditor asset={asset} members={members} liabilities={liabilities} onSave={onSave} onCancel={onCancel}/>;
  }
  return <SimpleAssetEditor asset={asset} members={members} onSave={onSave} onCancel={onCancel}/>;
}

function SimpleAssetEditor({ asset, members, onSave, onCancel }) {
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

// ============================================================================
// REAL ESTATE WIZARD — 4 steps: Description / Caractéristiques / Détails / Emprunts
// ============================================================================
const RE_SUBTYPES = [
  { key: 'rp',         label: 'Résidence principale' },
  { key: 'secondaire', label: 'Résidence secondaire' },
  { key: 'locative',   label: 'Investissement locatif' },
  { key: 'scpi',       label: 'SCPI' },
  { key: 'other',      label: 'Autre' },
];

const RE_STEPS = [
  { key: 'desc',  label: 'Description' },
  { key: 'specs', label: 'Caractéristiques' },
  { key: 'detail', label: 'Détails' },
  { key: 'loans', label: 'Emprunts rattachés' },
];

function RealEstateEditor({ asset, members, liabilities, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    ...asset,
    subtype: asset.subtype || 'rp',
    address: asset.address || '',
    purchasePrice: asset.purchasePrice ?? '',
    surfaceM2: asset.surfaceM2 ?? '',
    notaryFees: asset.notaryFees ?? '',
    agencyFees: asset.agencyFees ?? '',
    worksFees: asset.worksFees ?? '',
    furnitureFees: asset.furnitureFees ?? '',
    purchaseDate: asset.purchaseDate || '',
    constructionYear: asset.constructionYear ?? '',
    ownershipPct: asset.ownershipPct ?? 100,
    currentValue: asset.currentValue ?? '',
  });
  const [stepIdx, setStepIdx] = useState(0);
  const step = RE_STEPS[stepIdx].key;
  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const toggleMember = (mid) => {
    const ids = draft.memberIds || [];
    set('memberIds', ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid]);
  };
  const linkedLoans = (liabilities || []).filter(l => l.linkedAssetId === asset.id);

  const canSave = draft.name && (draft.memberIds || []).length > 0;
  const submit = () => {
    if (!canSave) { alert('Renseigne un nom et au moins un propriétaire.'); return; }
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  };

  // Auto-suggest current value when not set (purchase + works + furniture)
  const suggestedValue = (() => {
    const p = parseFloat(draft.purchasePrice) || 0;
    const w = parseFloat(draft.worksFees) || 0;
    const f = parseFloat(draft.furnitureFees) || 0;
    return p + w + f;
  })();

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal--wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{asset.id ? 'Modifier mon immobilier' : 'Ajouter mon immobilier'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="wizard-body">
          <nav className="wizard-steps">
            {RE_STEPS.map((s, i) => (
              <button
                key={s.key}
                className={`wizard-step ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}
                onClick={() => setStepIdx(i)}
              >
                <span className="wizard-step-num">{i + 1}</span>
                <span className="wizard-step-label">{s.label}</span>
              </button>
            ))}
          </nav>
          <div className="wizard-pane">
            {step === 'desc' && (
              <>
                <label><span>Nom du bien</span>
                  <input autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Appartement Paris 11e"/>
                </label>
                <label><span>Adresse <em>optionnel</em></span>
                  <input value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="58bis Cité Durmar, 75011 Paris"/>
                </label>
                <label><span>Catégorie</span>
                  <select value={draft.subtype} onChange={(e) => set('subtype', e.target.value)}>
                    {RE_SUBTYPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
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
              </>
            )}

            {step === 'specs' && (
              <>
                <label><span>Prix d'achat hors frais (€)</span>
                  <input type="number" value={draft.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} step="any"/>
                </label>
                <div className="field-row">
                  <label><span>Surface (m²)</span>
                    <input type="number" value={draft.surfaceM2} onChange={(e) => set('surfaceM2', e.target.value)} step="0.1"/>
                  </label>
                  <label><span>Détention (%)</span>
                    <input type="number" min={0} max={100} value={draft.ownershipPct} onChange={(e) => set('ownershipPct', e.target.value)} step="0.1"/>
                  </label>
                </div>
                <div className="field-row">
                  <label><span>Frais d'agence (€) <em>optionnel</em></span>
                    <input type="number" value={draft.agencyFees} onChange={(e) => set('agencyFees', e.target.value)} step="any"/>
                  </label>
                  <label><span>Frais de notaire (€) <em>optionnel</em></span>
                    <input type="number" value={draft.notaryFees} onChange={(e) => set('notaryFees', e.target.value)} step="any"/>
                  </label>
                </div>
                <div className="field-row">
                  <label><span>Frais de travaux (€) <em>optionnel</em></span>
                    <input type="number" value={draft.worksFees} onChange={(e) => set('worksFees', e.target.value)} step="any"/>
                  </label>
                  <label><span>Frais d'ameublement (€) <em>optionnel</em></span>
                    <input type="number" value={draft.furnitureFees} onChange={(e) => set('furnitureFees', e.target.value)} step="any"/>
                  </label>
                </div>
                <div className="field-row">
                  <label><span>Date d'achat <em>optionnel</em></span>
                    <input type="date" value={draft.purchaseDate || ''} onChange={(e) => set('purchaseDate', e.target.value)}/>
                  </label>
                  <label><span>Année de construction <em>optionnel</em></span>
                    <input type="number" value={draft.constructionYear} onChange={(e) => set('constructionYear', e.target.value)} placeholder="1985"/>
                  </label>
                </div>
              </>
            )}

            {step === 'detail' && (
              <>
                <label><span>Valeur actuelle (€)</span>
                  <input type="number" value={draft.currentValue} onChange={(e) => set('currentValue', e.target.value)} step="any"/>
                </label>
                {suggestedValue > 0 && (!draft.currentValue || parseFloat(draft.currentValue) === 0) && (
                  <button type="button" className="secondary-btn" style={{ alignSelf: 'flex-start' }} onClick={() => set('currentValue', String(suggestedValue))}>
                    Estimer à {Math.round(suggestedValue).toLocaleString('fr-FR')} € (achat + travaux + ameublement)
                  </button>
                )}
                <label><span>Notes <em>optionnel</em></span>
                  <textarea rows={3} value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="DPE, locataire, copro…"/>
                </label>
              </>
            )}

            {step === 'loans' && (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Les emprunts rattachés à ce bien apparaissent ici. Pour lier un nouveau crédit, ajoute-le depuis Patrimoine → Emprunts et sélectionne ce bien dans l'étape "Actifs liés" du wizard.
                </p>
                {linkedLoans.length === 0 ? (
                  <div className="empty-mini" style={{ padding: '32px 0' }}>
                    <CreditCard size={24}/>
                    <p>Aucun emprunt rattaché à ce bien.</p>
                  </div>
                ) : (
                  <div className="liability-list">
                    {linkedLoans.map(l => (
                      <div key={l.id} className="liability-card-v2" style={{ cursor: 'default' }}>
                        <div className="lia-header">
                          <div className="lia-icon" style={{ background: '#7c2d1222', color: '#7c2d12' }}><Home size={14}/></div>
                          <div className="lia-name-block">
                            <span className="lia-name">{l.name}</span>
                            <span className="lia-type">Restant dû : {Math.round(l.remainingCapital || 0).toLocaleString('fr-FR')} €</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="modal-footer wizard-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <div style={{ flex: 1 }}/>
          {stepIdx > 0 && <button className="secondary-btn" onClick={() => setStepIdx(stepIdx - 1)}><ChevronLeft size={14}/> Retour</button>}
          {stepIdx < RE_STEPS.length - 1 ? (
            <button className="primary-btn" onClick={() => setStepIdx(stepIdx + 1)}>Suivant <ChevronRight size={14}/></button>
          ) : (
            <button className="primary-btn" onClick={submit} disabled={!canSave}><Check size={14}/> Enregistrer</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// NET WORTH CHART — Finary-style toggles + period selector
// ============================================================================

const NW_PERIODS = [
  { key: '1M',  months: 1 },
  { key: 'YTD', months: 'ytd' },
  { key: '1A',  months: 12 },
  { key: 'TOUT', months: null },
];

const NW_MODES = [
  { key: 'net',       label: 'Patrimoine net' },
  { key: 'gross',     label: 'Patrimoine brut' },
  { key: 'financial', label: 'Patrimoine financier' },
];

const NetWorthChart = React.memo(function NetWorthChart({ snapshots = [], fmt }) {
  const [mode, setMode] = useState('net');
  const [view, setView] = useState('evolution'); // evolution | performance
  const [period, setPeriod] = useState('TOUT');

  // Project each snapshot row onto the selected mode value.
  const project = (s) => {
    const liquid = s.liquid_wealth || 0;
    const assets = s.assets_value || 0;
    const liabilities = s.liabilities_value || 0;
    const re = s.real_estate_value;
    const fin = s.financial_assets_value;
    const mortgage = s.mortgage_debt;
    const otherDebt = s.other_debt;
    if (mode === 'gross') return liquid + assets;
    if (mode === 'financial') {
      // Prefer the stored financial assets / non-mortgage debt; fall back to a
      // crude approximation for legacy rows that don't have the breakdown.
      const finVal = fin != null ? fin : (liquid + Math.max(0, assets - (re || 0)));
      const finDebt = otherDebt != null ? otherDebt : (mortgage == null ? 0 : Math.max(0, liabilities - mortgage));
      return finVal - finDebt;
    }
    // 'net' (default) — stored value is authoritative
    return s.net_worth || (liquid + assets - liabilities);
  };

  // Apply the period filter
  const today = new Date();
  const filtered = useMemo(() => {
    const sorted = [...snapshots].sort((a, b) => a.month.localeCompare(b.month));
    if (period === 'TOUT') return sorted;
    if (period === 'YTD') {
      const cutoff = `${today.getFullYear()}-01`;
      return sorted.filter(s => s.month >= cutoff);
    }
    const months = NW_PERIODS.find(p => p.key === period)?.months || 12;
    const cutDate = new Date(today.getFullYear(), today.getMonth() - months, 1);
    const cutKey = `${cutDate.getFullYear()}-${String(cutDate.getMonth() + 1).padStart(2, '0')}`;
    return sorted.filter(s => s.month >= cutKey);
  }, [snapshots, period, today]);

  const baseline = filtered[0] ? project(filtered[0]) : 0;
  const data = filtered.map(s => {
    const v = project(s);
    const perf = baseline > 0 ? ((v - baseline) / baseline) * 100 : 0;
    return { month: s.month, value: Math.round(v), perf: Number(perf.toFixed(2)) };
  });

  const last = data[data.length - 1] || { value: 0, perf: 0 };
  const first = data[0] || { value: 0 };
  const delta = last.value - first.value;
  const deltaPct = first.value > 0 ? ((last.value - first.value) / first.value) * 100 : 0;

  const dataKey = view === 'performance' ? 'perf' : 'value';

  return (
    <div className="nw-chart">
      <div className="nw-header">
        <div className="nw-header-left">
          <select className="nw-mode-select" value={mode} onChange={(e) => setMode(e.target.value)}>
            {NW_MODES.map(m => <option key={m.key} value={m.key}>{m.label}</option>)}
          </select>
          <div className="nw-current">
            <div className="nw-current-value">{fmt(last.value)}</div>
            <div className={`nw-current-delta ${delta >= 0 ? 'positive' : 'negative'}`}>
              {delta >= 0 ? '+' : ''}{fmt(delta)} <span className="nw-pct">({delta >= 0 ? '+' : ''}{deltaPct.toFixed(2)}%)</span>
              <span className="nw-period-label">· {period}</span>
            </div>
          </div>
        </div>
        <div className="nw-toggles">
          <div className="nw-toggle-group">
            <button className={view === 'evolution' ? 'active' : ''} onClick={() => setView('evolution')}>Évolution</button>
            <button className={view === 'performance' ? 'active' : ''} onClick={() => setView('performance')}>Performance %</button>
          </div>
        </div>
      </div>

      {data.length >= 2 ? (
        <ResponsiveContainer width="100%" height={260}>
          <AreaChart data={data} margin={{ top: 10, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="nwGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.32}/>
                <stop offset="100%" stopColor="var(--primary)" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
            <XAxis dataKey="month" tickFormatter={(m) => formatDate(m + '-01', { format: 'monthYear' })} stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false}/>
            <YAxis tickFormatter={(v) => view === 'performance' ? `${v}%` : formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11} tickLine={false} axisLine={false} width={55}/>
            <Tooltip
              contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12, color: 'var(--text-primary)' }}
              formatter={(v) => view === 'performance' ? `${v}%` : formatCurrency(v)}
              labelFormatter={(m) => formatDate(m + '-01', { format: 'long' })}
            />
            <Area type="monotone" dataKey={dataKey} stroke="var(--primary)" strokeWidth={2} fill="url(#nwGrad)"/>
          </AreaChart>
        </ResponsiveContainer>
      ) : (
        <div className="empty-mini" style={{ padding: '40px 0' }}>
          <Activity size={26}/>
          <p>Pas encore assez de snapshots pour cette période. Reviens dans quelques mois ou élargis la période.</p>
        </div>
      )}

      <div className="nw-period-bar">
        {NW_PERIODS.map(p => (
          <button key={p.key} className={period === p.key ? 'active' : ''} onClick={() => setPeriod(p.key)}>{p.key}</button>
        ))}
      </div>
    </div>
  );
});

// ============================================================================
// LIABILITY WIZARD (5 steps — inspired by Finary)
// ============================================================================
const LIABILITY_STEPS = [
  { key: 'main',    label: 'Infos principales' },
  { key: 'specs',   label: 'Caractéristiques' },
  { key: 'duration',label: 'Durée' },
  { key: 'fees',    label: 'Frais & détention' },
  { key: 'linked',  label: 'Actifs liés' },
];

function LiabilityEditor({ liability, members, assets = [], onSave, onCancel }) {
  const [draft, setDraft] = useState({
    ...liability,
    initialCapital: liability.initialCapital ?? '',
    remainingCapital: liability.remainingCapital ?? '',
    monthlyPayment: liability.monthlyPayment ?? '',
    interestRate: liability.interestRate ?? '',
    downPayment: liability.downPayment ?? '',
    insuranceRate: liability.insuranceRate ?? '',
    applicationFees: liability.applicationFees ?? '',
    ownershipPct: liability.ownershipPct ?? 100,
    durationMonths: liability.durationMonths ?? '',
    startDate: liability.startDate || '',
    linkedAssetId: liability.linkedAssetId || '',
  });
  const [stepIdx, setStepIdx] = useState(0);
  const step = LIABILITY_STEPS[stepIdx].key;

  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const toggleMember = (mid) => {
    const ids = draft.memberIds || [];
    set('memberIds', ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid]);
  };

  const canSave = draft.name && (draft.memberIds || []).length > 0;
  const submit = () => {
    if (!canSave) { alert('Renseigne au moins un nom et un emprunteur.'); return; }
    onSave(draft);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal--wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{liability.id ? 'Modifier l\'emprunt' : 'Ajouter un emprunt'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="wizard-body">
          <nav className="wizard-steps">
            {LIABILITY_STEPS.map((s, i) => (
              <button
                key={s.key}
                className={`wizard-step ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}
                onClick={() => setStepIdx(i)}
              >
                <span className="wizard-step-num">{i + 1}</span>
                <span className="wizard-step-label">{s.label}</span>
              </button>
            ))}
          </nav>
          <div className="wizard-pane">
            {step === 'main' && (
              <>
                <label><span>Nom</span>
                  <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Emprunt RP, Auto, …" autoFocus/>
                </label>
                <label><span>Type</span>
                  <select value={draft.type} onChange={(e) => set('type', e.target.value)}>
                    {LIABILITY_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <div className="field-row">
                  <label><span>Montant emprunté (€)</span>
                    <input type="number" value={draft.initialCapital} onChange={(e) => set('initialCapital', e.target.value)} step="any"/>
                  </label>
                  <label><span>Apport (€) <em>optionnel</em></span>
                    <input type="number" value={draft.downPayment} onChange={(e) => set('downPayment', e.target.value)} step="any"/>
                  </label>
                </div>
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
              </>
            )}

            {step === 'specs' && (
              <>
                <div className="field-row">
                  <label><span>Mensualité totale (€)</span>
                    <input type="number" value={draft.monthlyPayment} onChange={(e) => set('monthlyPayment', e.target.value)} step="any"/>
                  </label>
                  <label><span>Taux d'intérêt (%)</span>
                    <input type="number" value={draft.interestRate} onChange={(e) => set('interestRate', e.target.value)} step="0.01"/>
                  </label>
                </div>
                <label><span>Taux d'assurance (%) <em>optionnel</em></span>
                  <input type="number" value={draft.insuranceRate} onChange={(e) => set('insuranceRate', e.target.value)} step="0.01"/>
                </label>
                <label><span>Capital restant dû (€)</span>
                  <input type="number" value={draft.remainingCapital} onChange={(e) => set('remainingCapital', e.target.value)} step="any"/>
                </label>
              </>
            )}

            {step === 'duration' && (
              <>
                <div className="field-row">
                  <label><span>Date de première échéance</span>
                    <input type="date" value={draft.startDate || ''} onChange={(e) => set('startDate', e.target.value)}/>
                  </label>
                  <label><span>Durée totale (mois)</span>
                    <input type="number" value={draft.durationMonths} onChange={(e) => set('durationMonths', e.target.value)} placeholder="240"/>
                  </label>
                </div>
                <label><span>Date de fin</span>
                  <input type="date" value={draft.endDate || ''} onChange={(e) => set('endDate', e.target.value)}/>
                </label>
                <div className="settings-info">
                  <Lightbulb size={14}/>
                  <span>Tu peux soit saisir la durée totale, soit la date de fin. Wealthly utilise les deux pour calculer le calendrier d'amortissement.</span>
                </div>
              </>
            )}

            {step === 'fees' && (
              <>
                <div className="field-row">
                  <label><span>Frais de dossier (€) <em>optionnel</em></span>
                    <input type="number" value={draft.applicationFees} onChange={(e) => set('applicationFees', e.target.value)} step="any"/>
                  </label>
                  <label><span>Détention de l'emprunt (%) <em>optionnel</em></span>
                    <input type="number" value={draft.ownershipPct} onChange={(e) => set('ownershipPct', e.target.value)} min="0" max="100" step="0.1"/>
                  </label>
                </div>
                <label><span>Notes</span>
                  <textarea rows={3} value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)}/>
                </label>
              </>
            )}

            {step === 'linked' && (
              <>
                <label><span>Actif lié <em>optionnel</em></span>
                  <select value={draft.linkedAssetId || ''} onChange={(e) => set('linkedAssetId', e.target.value)}>
                    <option value="">— Aucun —</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <div className="settings-info">
                  <Lightbulb size={14}/>
                  <span>Lier un emprunt à un actif (ex: ton crédit immobilier à ta résidence principale) permet à Wealthly de croiser les deux dans tes vues Patrimoine.</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="modal-footer wizard-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <div style={{ flex: 1 }}/>
          {stepIdx > 0 && <button className="secondary-btn" onClick={() => setStepIdx(stepIdx - 1)}><ChevronLeft size={14}/> Retour</button>}
          {stepIdx < LIABILITY_STEPS.length - 1 ? (
            <button className="primary-btn" onClick={() => setStepIdx(stepIdx + 1)}>Suivant <ChevronRight size={14}/></button>
          ) : (
            <button className="primary-btn" onClick={submit} disabled={!canSave}><Check size={14}/> Enregistrer</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOAN AMORTIZATION + DETAIL VIEW
// ============================================================================

/**
 * Compute a fixed-rate annuity amortization schedule.
 *
 * Returns one row per month: { idx, date, capital, interest, insurance,
 * payment, remaining }. The last row's `remaining` should be ~0.
 *
 * Inputs:
 *  - principal   : initial capital (€)
 *  - annualRate  : annual interest rate in % (e.g. 1.25 → 1.25%)
 *  - durationM   : total duration in months
 *  - insuranceRate : annual insurance rate in % of initial principal
 *  - startDate   : ISO date string for the first payment (used to label rows)
 *  - paymentOverride : optional fixed monthly payment (capital + interest);
 *                       used if provided so the UI can match the value the
 *                       user actually pays — otherwise computed from formula.
 */
function buildAmortization({ principal, annualRate, durationM, insuranceRate, startDate, paymentOverride }) {
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
}

function LiabilityDetail({ liability, assets, members, memberShare, fmt, onEdit, onClose }) {
  const l = liability;
  const schedule = useMemo(() => buildAmortization({
    principal: l.initialCapital,
    annualRate: l.interestRate,
    durationM: l.durationMonths,
    insuranceRate: l.insuranceRate,
    startDate: l.startDate,
    paymentOverride: l.monthlyPayment,
  }), [l]);

  const today = new Date().toISOString().slice(0, 10);
  const paidRows = schedule.filter(r => r.date <= today);
  const remainingRows = schedule.filter(r => r.date > today);
  const totalCost = schedule.reduce((s, r) => s + r.payment, 0) + (parseFloat(l.applicationFees) || 0);
  const totalCapitalPaid = paidRows.reduce((s, r) => s + r.capital, 0);
  const totalInterestPaid = paidRows.reduce((s, r) => s + r.interest, 0);
  const totalInsurancePaid = paidRows.reduce((s, r) => s + r.insurance, 0);
  const totalPaid = totalCapitalPaid + totalInterestPaid + totalInsurancePaid;
  const totalRemaining = remainingRows.reduce((s, r) => s + r.payment, 0);
  const computedRemaining = remainingRows.length > 0 ? remainingRows[0].remaining + remainingRows[0].capital : 0;
  const remainingCapital = parseFloat(l.remainingCapital) > 0 ? parseFloat(l.remainingCapital) : computedRemaining;
  const principal = parseFloat(l.initialCapital) || 0;
  const pctRepaid = principal > 0 ? Math.min(100, ((principal - remainingCapital) / principal) * 100) : 0;
  const linkedAsset = l.linkedAssetId ? assets.find(a => a.id === l.linkedAssetId) : null;
  const owners = (l.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');

  // Mensualité breakdown — on prend la première échéance non payée si dispo,
  // sinon la première
  const ref = remainingRows[0] || schedule[0] || null;

  const chartData = schedule.map(r => ({
    date: r.date,
    remaining: Math.round(r.remaining),
    paid: Math.round(principal - r.remaining),
  }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChevronLeft size={18} style={{ cursor: 'pointer' }} onClick={onClose}/>
            <h2>{l.name}</h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="secondary-btn" onClick={onEdit}><Edit3 size={13}/> Modifier</button>
            <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
          </div>
        </div>

        <div className="loan-detail-body">
          <div className="loan-detail-top">
            <div className="loan-amort-block">
              <div className="loan-amort-period">
                {l.startDate ? formatDate(l.startDate, { format: 'short' }) : '—'}
                {' → '}
                {l.endDate ? formatDate(l.endDate, { format: 'short' }) : '—'}
              </div>
              <div className="loan-amort-value">{fmt(remainingCapital)}</div>
              <div className="loan-amort-meta">capital restant dû</div>
              {schedule.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="amort-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(0, 4)} stroke="var(--text-tertiary)" fontSize={11} interval={Math.max(0, Math.floor(schedule.length / 8))}/>
                    <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11}/>
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      labelFormatter={(d) => formatDate(d, { format: 'monthYear' })}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="remaining" name="Capital restant" stroke="var(--primary)" strokeWidth={2} fill="url(#amort-fill)"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-mini">
                  <BarChart3 size={20}/>
                  <p>Renseigne le capital, le taux et la durée pour voir la courbe d'amortissement.</p>
                </div>
              )}
            </div>

            <aside className="loan-monthly-card">
              <div className="loan-monthly-label">MENSUALITÉ</div>
              <div className="loan-monthly-value">{fmt(parseFloat(l.monthlyPayment) || (ref?.payment ?? 0))}</div>
              <div className="loan-monthly-sub">par mois</div>
              {ref && (
                <div className="loan-monthly-breakdown">
                  <div><span className="dot dot-cap"/>Capital</div><div>{fmt(ref.capital)}</div>
                  <div><span className="dot dot-int"/>Intérêts</div><div>{fmt(ref.interest)}</div>
                  <div><span className="dot dot-ins"/>Assurance</div><div>{fmt(ref.insurance)}</div>
                </div>
              )}
              <div className="loan-monthly-stats">
                <div><span>Échéances payées</span><strong>{paidRows.length}</strong></div>
                <div><span>Échéances restantes</span><strong>{remainingRows.length}</strong></div>
                <div><span>Date de fin</span><strong>{l.endDate ? formatDate(l.endDate, { format: 'monthYear' }) : '—'}</strong></div>
              </div>
              <div className="loan-pct-pill">Tu as remboursé {pctRepaid.toFixed(0)} % du capital du prêt</div>
            </aside>
          </div>

          <h3 className="loan-section-title">Synthèse</h3>
          <div className="loan-summary-grid">
            <div className="loan-summary-card">
              <div className="loan-summary-label">COÛT TOTAL DE L'EMPRUNT</div>
              <div className="loan-summary-value">{fmt(totalCost)}</div>
              <div className="loan-summary-rows">
                <div><span>Capital</span><span>{fmt(principal)}</span></div>
                <div><span>Intérêts et assurance</span><span>{fmt(totalCost - principal - (parseFloat(l.applicationFees) || 0))}</span></div>
                <div><span>Frais de dossier</span><span>{l.applicationFees ? fmt(parseFloat(l.applicationFees)) : '—'}</span></div>
              </div>
            </div>

            <div className="loan-summary-card">
              <div className="loan-summary-label">TOTAL REMBOURSÉ</div>
              <div className="loan-summary-value">{fmt(totalPaid)}</div>
              <div className="loan-summary-rows">
                <div><span>Capital</span><span>{fmt(totalCapitalPaid)}</span></div>
                <div><span>Intérêts</span><span>{fmt(totalInterestPaid)}</span></div>
                <div><span>Assurance</span><span>{fmt(totalInsurancePaid)}</span></div>
              </div>
            </div>

            <div className="loan-summary-card">
              <div className="loan-summary-label">CAPITAL RESTANT DÛ</div>
              <div className="loan-summary-value">{fmt(remainingCapital)}</div>
              <div className="loan-summary-rows">
                <div><span>Reste à rembourser</span><span>{fmt(totalRemaining)}</span></div>
                <div><span>Reste à rembourser (%)</span><span>{(100 - pctRepaid).toFixed(0)} %</span></div>
              </div>
            </div>
          </div>

          {(linkedAsset || owners) && (
            <div className="loan-meta-row">
              {linkedAsset && (
                <div className="loan-meta-pill"><Home size={14}/> Lié à <strong>{linkedAsset.name}</strong></div>
              )}
              {owners && (
                <div className="loan-meta-pill"><Users size={14}/> {owners}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// SETTINGS
// ============================================================================
function SettingsView({ members, accounts, accountBalances, saveMember, deleteMember, deleteAccount, exportData, importData, resetAllData, categories = [], fmt }) {
  const [editingMember, setEditingMember] = useState(null);
  const COLORS = MEMBER_PALETTE;

  return (
    <div className="settings-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Réglages</h1>
          <p className="page-subtitle">Membres, comptes, catégories, données.</p>
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
                <span className="member-avatar large" style={{ background: 'var(--info)' }}>{a.bank?.charAt(0) || '?'}</span>
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
          <span>Exportez un backup régulièrement. C'est votre filet de sécurité avant une migration ou un changement d'instance.</span>
        </div>
      </section>

      <BankConnectionsSection />

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

// ============================================================================
// BANK CONNECTIONS SECTION (GoCardless)
// ============================================================================
function BankConnectionsSection() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [unavailable, setUnavailable] = useState(false);
  const [picker, setPicker] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await api.banks.listConnections();
      setConnections(list || []);
      setUnavailable(false);
    } catch (e) {
      // 503 = backend not configured, hide the section gracefully
      if (e.message && e.message.includes('non configurées')) {
        setUnavailable(true);
      } else {
        setSyncMessage({ kind: 'error', text: e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleSync = async (id) => {
    setSyncingId(id);
    setSyncMessage(null);
    try {
      const res = await api.banks.sync(id);
      setSyncMessage({
        kind: res.error ? 'warn' : 'ok',
        text: res.error
          ? `${res.inserted} nouvelles · ${res.skipped} ignorées · erreur : ${res.error}`
          : `${res.inserted} nouvelles transaction${res.inserted > 1 ? 's' : ''}, ${res.skipped} ignorée${res.skipped > 1 ? 's' : ''}`,
      });
      await reload();
    } catch (e) {
      setSyncMessage({ kind: 'error', text: e.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Déconnecter ${name} ? Les transactions importées sont conservées.`)) return;
    try {
      await api.banks.delete(id);
      await reload();
    } catch (e) {
      setSyncMessage({ kind: 'error', text: e.message });
    }
  };

  if (unavailable) {
    return (
      <section className="card">
        <div className="card-header"><h3><Link2 size={16}/> Connexions bancaires</h3></div>
        <div className="settings-info">
          <Lightbulb size={14}/>
          <span>
            La synchronisation bancaire automatique n'est pas activée sur ce backend. Configure
            <code style={{ margin: '0 4px' }}>GOCARDLESS_SECRET_ID</code> et
            <code style={{ margin: '0 4px' }}>GOCARDLESS_SECRET_KEY</code> côté Railway pour l'activer.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3><Link2 size={16}/> Connexions bancaires</h3>
        <button className="secondary-btn" onClick={() => setPicker(true)}><Plus size={14}/> Connecter une banque</button>
      </div>

      {syncMessage && (
        <div className="settings-info" style={{
          color: syncMessage.kind === 'error' ? 'var(--danger)' : syncMessage.kind === 'warn' ? 'var(--warning)' : 'var(--success)',
        }}>
          <AlertCircle size={14}/><span>{syncMessage.text}</span>
        </div>
      )}

      {loading && <div className="empty-mini"><RefreshCw size={20} className="spin"/><p>Chargement…</p></div>}

      {!loading && connections.length === 0 && (
        <div className="empty-mini">
          <Link2 size={24}/>
          <p>Aucune banque connectée. Ajoute-en une pour recevoir tes transactions automatiquement.</p>
        </div>
      )}

      <div className="member-list">
        {connections.map((c) => {
          const expiringSoon = c.days_until_expiry !== null && c.days_until_expiry <= 7;
          const linkedCount = c.account_links.filter((l) => l.account_id).length;
          return (
            <div key={c.id} className="member-card" style={{ alignItems: 'flex-start' }}>
              <span className="member-avatar large" style={{ background: '#1f2026', overflow: 'hidden' }}>
                {c.institution_logo ? (
                  <img src={c.institution_logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                ) : (c.institution_name || '?').charAt(0)}
              </span>
              <div className="member-card-info" style={{ flex: 1 }}>
                <div className="member-card-name">{c.institution_name}</div>
                <div className="member-card-role">
                  {linkedCount}/{c.account_links.length} compte{c.account_links.length > 1 ? 's' : ''} lié{linkedCount > 1 ? 's' : ''}
                  {' · '}
                  {c.last_sync_at ? `Synchro : ${new Date(c.last_sync_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Jamais synchronisé'}
                  {' · '}
                  <span style={{ color: c.status === 'LN' ? 'var(--success)' : 'var(--warning)' }}>
                    {c.status_label}
                  </span>
                  {expiringSoon && (
                    <span style={{ color: 'var(--warning)' }}>
                      {' · expire dans '}{c.days_until_expiry}j
                    </span>
                  )}
                </div>
                {c.last_sync_error && (
                  <div className="member-card-role" style={{ color: 'var(--danger)', marginTop: 4 }}>
                    {c.last_sync_error}
                  </div>
                )}
              </div>
              <button
                className="icon-btn-sm"
                title="Synchroniser maintenant"
                onClick={() => handleSync(c.id)}
                disabled={syncingId === c.id || c.status !== 'LN'}
              >
                <RefreshCw size={13} className={syncingId === c.id ? 'spin' : ''}/>
              </button>
              <button className="icon-btn-sm" title="Déconnecter" onClick={() => handleDelete(c.id, c.institution_name)}>
                <Unlink size={13}/>
              </button>
            </div>
          );
        })}
      </div>

      <div className="settings-info" style={{ marginTop: 14 }}>
        <Lightbulb size={14}/>
        <span>
          Le consentement DSP2 dure <strong>90 jours</strong> max — à renouveler en re-connectant la banque. Les transactions sont catégorisées avec tes règles existantes.
        </span>
      </div>

      {picker && <InstitutionPicker onClose={() => setPicker(false)}/>}
    </section>
  );
}

function InstitutionPicker({ onClose }) {
  const [institutions, setInstitutions] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.banks.listInstitutions('FR');
        setInstitutions(list || []);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const filtered = (institutions || []).filter((i) =>
    i.name.toLowerCase().includes(filter.toLowerCase())
  );

  const start = async (institutionId) => {
    setConnecting(institutionId);
    try {
      const res = await api.banks.connect(institutionId);
      // Hard navigation to the bank's auth page
      window.location.href = res.redirect_url;
    } catch (e) {
      setError(e.message);
      setConnecting(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Connecter une banque</h2>
          <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          {error && <div className="settings-info" style={{ color: 'var(--danger)' }}><AlertCircle size={14}/><span>{error}</span></div>}
          <label>
            <span>Rechercher</span>
            <input
              type="text"
              autoFocus
              placeholder="BNP, Boursorama, Revolut…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          {!institutions && !error && <div className="empty-mini"><RefreshCw size={20} className="spin"/><p>Chargement des banques…</p></div>}
          {institutions && (
            <div className="member-list" style={{ maxHeight: 320, overflowY: 'auto', marginTop: 12 }}>
              {filtered.map((i) => (
                <button
                  key={i.id}
                  className="member-card"
                  onClick={() => start(i.id)}
                  disabled={connecting === i.id}
                  style={{ cursor: 'pointer', textAlign: 'left', background: 'transparent', border: '1px solid var(--border)' }}
                >
                  <span className="member-avatar large" style={{ background: '#1f2026', overflow: 'hidden' }}>
                    {i.logo ? <img src={i.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : i.name.charAt(0)}
                  </span>
                  <div className="member-card-info">
                    <div className="member-card-name">{i.name}</div>
                    {i.bic && <div className="member-card-role">{i.bic}</div>}
                  </div>
                  {connecting === i.id && <RefreshCw size={14} className="spin"/>}
                </button>
              ))}
              {filtered.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Aucune banque pour ce filtre.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
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

