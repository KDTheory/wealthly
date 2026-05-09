import React, { useState, useEffect, useMemo, useCallback, useRef, lazy, Suspense } from 'react';
import { LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, RadialBarChart, RadialBar, ComposedChart, Sankey, Layer, Rectangle } from 'recharts';
import { Upload, Plus, TrendingUp, TrendingDown, Wallet, Home, Coins, CreditCard, Users, Settings, Search, Download, Trash2, Edit3, Check, X, ChevronRight, ChevronLeft, ChevronDown, AlertCircle, AlertTriangle, Repeat, Calendar, ArrowUpDown, Eye, EyeOff, Sparkles, PiggyBank, Bitcoin, Banknote, Landmark, BarChart3, Target, Heart, Sun, Moon, Zap, Activity, ArrowUp, ArrowDown, Minus, PartyPopper, Lightbulb, Bell, ChevronUp, Play, Lock, Unlock, LogOut, Cloud, RefreshCw, FileText, Calculator, Link2, Unlink, Menu } from 'lucide-react';
import * as api from './api.js';
import { useTranslation } from 'react-i18next';
import { LangButton } from './components/LangButton.jsx';
import { getDemoData } from './demoData.js';
import {
  APP_NAME, STORAGE_KEYS, DEFAULT_CATEGORIES, DEFAULT_RULES, BANK_PROFILES,
  ASSET_TYPES, ASSET_CLASS_MAP, LIABILITY_TYPES,
} from './constants.js';
import { storage } from './storage.js';
import {
  formatCurrency, formatDate, monthKey, dayOfMonth, generateId, hashTransaction,
  parseCSV, detectBankProfile, autoDetectMapping, applyMapping,
  categorize, detectRecurring,
  accountIncludeInNetWorth, accountCountsAsIncome, accountCountsAsExpense,
  detectInternalTransfers, convertCurrency,
} from './utils.js';
import { useRates } from './hooks/useRates.js';
import { useBaseCurrency } from './hooks/useBaseCurrency.js';
import { Styles } from './Styles.jsx';
import { Toast } from './components/Toast.jsx';
import { AnimatedNumber } from './components/AnimatedNumber.jsx';
import { Onboarding } from './views/Onboarding.jsx';
import { Transactions } from './views/Transactions.jsx';
import { Analysis } from './views/Analysis.jsx';
import { Monthly } from './views/Monthly.jsx';
import { Cashflow } from './views/Cashflow.jsx';
import { Budgets } from './views/Budgets.jsx';
import { Dashboard } from './views/Dashboard.jsx';
import { Wealth } from './views/Wealth.jsx';
import { SettingsView } from './views/Settings.jsx';
import { ImportFlow } from './views/ImportFlow.jsx';
import { AccountDrawer } from './components/AccountDrawer.jsx';

const TaxSimulator = lazy(() => import('./TaxSimulator.jsx'));

// Disable Recharts animations globally — they cause noticeable jank on iOS Safari
// (SVG <animate> on every render) and add no UX value for static financial data.
[Line, Bar, Area, Pie, RadialBar, Sankey].forEach((C) => {
  if (C) C.defaultProps = { ...(C.defaultProps || {}), isAnimationActive: false };
});

// ============================================================================
// MAIN APP
// ============================================================================
export default function WealthlyApp({ demoMode = false, onExitDemo }) {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [onboarded, setOnboarded] = useState(() => {
    try { return localStorage.getItem(STORAGE_KEYS.ONBOARDED) === '1'; } catch { return false; }
  });
  const [view, setView] = useState('dashboard');
  // Account drawer + cross-view transaction filter (set when "voir toutes" is
  // clicked from the drawer, consumed by <Transactions> on mount).
  const [drawerAccount, setDrawerAccount] = useState(null);
  const [navOpen, setNavOpen] = useState(false);
  const [txInitialAccountFilter, setTxInitialAccountFilter] = useState(null);
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
  const [currentUser, setCurrentUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('w2:current_user') || 'null'); } catch { return null; }
  });
  const [hideAmounts, setHideAmounts] = useState(false);
  const [toast, setToast] = useState(null);
  const [sidebarMenuOpen, setSidebarMenuOpen] = useState(false);

  // Multi-currency: user's display currency + live FX rates (Frankfurter, 1h cache).
  // EUR base is implicit (rates table is { USD: 1.08, GBP: 0.85, CHF: 0.97 }).
  const [baseCurrency, setBaseCurrency] = useBaseCurrency();
  const { rates, date: ratesDate } = useRates();

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
    role: a.role || 'principal',
    initialBalance: a.initial_balance,
    memberIds: a.member_ids || [],
    currentBalance: a.current_balance,
  });
  const accountToApi = (a) => ({
    name: a.name,
    bank: a.bank,
    type: a.type,
    role: a.role || 'principal',
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
    isTransferOverride: t.is_transfer_override ?? null,
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
    is_transfer_override: t.isTransferOverride ?? null,
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
      const mappedAccounts = accList.map(accountFromApi);
      const mappedTx = txList.map(txFromApi);
      const mappedAssets = astList.map(assetFromApi);
      const mappedLia = liaList.map(liaFromApi);
      const cats = (catList || []).map(categoryFromApi);
      const finalCats = cats.length > 0 ? cats : DEFAULT_CATEGORIES;
      const budDict = {};
      (budList || []).forEach(b => { budDict[b.category_slug] = b.amount; });
      const mappedGoals = (goalList || []).map(goalFromApi);
      const mappedRules = (ruleList || []).map(r => ({ pattern: r.pattern, categoryId: r.category_slug, source: r.source, _id: r.id }));
      setMembers(memList);
      setAccounts(mappedAccounts);
      setTransactions(mappedTx);
      setAssets(mappedAssets);
      setLiabilities(mappedLia);
      setCategories(finalCats);
      setBudgets(budDict);
      setGoals(mappedGoals);
      setFixedCharges(fcList || []);
      setCustomRules(mappedRules);
      // Persist a cache snapshot for stale-while-revalidate on next visit
      try {
        localStorage.setItem(STORAGE_KEYS.DATA_CACHE, JSON.stringify({
          members: memList, accounts: mappedAccounts, transactions: mappedTx,
          assets: mappedAssets, liabilities: mappedLia, categories: finalCats,
          budgets: budDict, goals: mappedGoals, fixedCharges: fcList || [],
          customRules: mappedRules, cachedAt: Date.now(),
        }));
      } catch {}
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
      // In demo mode, force the family ("all") view — a stale per-member
      // selection from a previous logged-in session would point to a member
      // that doesn't exist in the demo dataset, leaving every screen empty.
      setActiveMemberId(demoMode ? 'all' : am);
      setColumnMappings(await storage.get(STORAGE_KEYS.MAPPINGS, {}));

      if (demoMode) {
        // Demo data is local — load synchronously then show.
        await reloadAll();
        setOnboarded(true);
        setLoading(false);
      } else {
        // Restore cache immediately (milliseconds — no network).
        try {
          const raw = localStorage.getItem(STORAGE_KEYS.DATA_CACHE);
          if (raw) {
            const c = JSON.parse(raw);
            if (c.members) setMembers(c.members);
            if (c.accounts) setAccounts(c.accounts);
            if (c.transactions) setTransactions(c.transactions);
            if (c.assets) setAssets(c.assets);
            if (c.liabilities) setLiabilities(c.liabilities);
            if (c.categories) setCategories(c.categories);
            if (c.budgets) setBudgets(c.budgets);
            if (c.goals) setGoals(c.goals);
            if (c.fixedCharges) setFixedCharges(c.fixedCharges);
            if (c.customRules) setCustomRules(c.customRules);
          }
        } catch {}

        // Show the app NOW — don't gate on Railway cold-start (15-30s).
        // Empty states are fine; data fills in once the backend wakes up.
        setLoading(false);

        // Refresh from API in the background.
        reloadAll().then(async () => {
          try {
            const me = await api.auth.me();
            if (me) {
              setCurrentUser(me);
              try { localStorage.setItem('w2:current_user', JSON.stringify(me)); } catch {}
            }
            const memList = await api.members.list();
            const hasMembers = memList && memList.length > 0;
            setOnboarded(hasMembers);
            try { localStorage.setItem(STORAGE_KEYS.ONBOARDED, hasMembers ? '1' : '0'); } catch {}
            if (me && me.is_admin) {
              const lastSyncKey = `wealthly:lastBankSync:${me.id}`;
              const last = parseInt(localStorage.getItem(lastSyncKey) || '0', 10);
              if (Date.now() - last > 86400000) {
                localStorage.setItem(lastSyncKey, String(Date.now()));
                api.banks.syncAll().then(async (res) => {
                  if (res && res.inserted > 0) await reloadAll();
                }).catch(() => {});
              }
            }
          } catch {}
        }).catch(() => {});
      }
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

  const liquidWealth = useMemo(
    () => visibleAccounts
      .filter(a => accountIncludeInNetWorth(a.role))
      .reduce((sum, a) => sum + (accountBalances[a.id] || 0) * memberShare(a), 0),
    [visibleAccounts, accountBalances, memberShare]
  );
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

  // Identify pair-matched transfers between the user's own accounts so we
  // can exclude them from cashflow aggregates. Recomputes whenever the
  // visible transaction set changes.
  // Effective set = auto-detected ∪ {override:true} − {override:false}.
  // Override is the source of truth so the user can always correct a bad
  // auto-classification. Pairs come from auto-detection only — manual
  // overrides don't reconstruct a counterpart.
  const { transferIds, transferPairs } = useMemo(() => {
    const auto = detectInternalTransfers(visibleTransactions);
    const ids = new Set();
    visibleTransactions.forEach(t => {
      if (t.isTransferOverride === true) ids.add(t.id);
      else if (t.isTransferOverride === false) { /* explicitly NOT a transfer */ }
      else if (auto.has(t.id)) ids.add(t.id);
    });
    // Filter out pairs whose either leg has been overridden to "not a transfer"
    const overriddenOff = new Set(visibleTransactions.filter(t => t.isTransferOverride === false).map(t => t.id));
    const pairs = (auto.pairs || []).filter(p => !overriddenOff.has(p.outTxId) && !overriddenOff.has(p.inTxId));
    return { transferIds: ids, transferPairs: pairs };
  }, [visibleTransactions]);

  const monthlyEvolution = useMemo(() => {
    const monthly = {};
    const sortedTx = [...visibleTransactions].sort((a, b) => a.date.localeCompare(b.date));
    const months = new Set();
    sortedTx.forEach(t => months.add(monthKey(t.date)));
    const sortedMonths = Array.from(months).sort();
    // Net worth running balance counts every account whose role contributes
    // to patrimoine net (everything except 'professionnel' by default).
    let runningTotal = visibleAccounts
      .filter(a => accountIncludeInNetWorth(a.role))
      .reduce((sum, a) => sum + (a.initialBalance || 0) * memberShare(a), 0);
    sortedMonths.forEach(m => { monthly[m] = { month: m, income: 0, expenses: 0, net: 0, balance: 0, fixed: 0, variable: 0, savings: 0 }; });
    sortedTx.forEach(t => {
      const m = monthKey(t.date);
      const acc = accounts.find(a => a.id === t.accountId);
      const share = acc ? memberShare(acc) : 1;
      const sharedAmount = t.amount * share;
      const cat = categories.find(c => c.id === t.categoryId);
      const role = acc?.role || 'principal';
      const isTransfer = transferIds.has(t.id);
      // Cashflow attribution depends on (1) whether this tx is an internal
      // transfer (excluded from income/expense regardless of role), and
      // (2) the account's role for non-transfer flows.
      if (!isTransfer) {
        if (t.amount > 0) {
          if (accountCountsAsIncome(role)) monthly[m].income += sharedAmount;
        } else {
          if (accountCountsAsExpense(role)) {
            const absShared = Math.abs(sharedAmount);
            monthly[m].expenses += absShared;
            if (recurringIds.has(t.id)) monthly[m].fixed += absShared;
            else monthly[m].variable += absShared;
            if (cat?.kind === 'savings') monthly[m].savings += absShared;
          }
        }
      }
      // Running balance still tracks every transaction on a NW-eligible
      // account, so the net worth chart stays correct even when an epargne
      // account receives a transfer (the source account's symmetric outflow
      // cancels it out at the foyer level).
      if (accountIncludeInNetWorth(role)) monthly[m].net += sharedAmount;
    });
    sortedMonths.forEach(m => { runningTotal += monthly[m].net; monthly[m].balance = runningTotal; });
    return Object.values(monthly);
  }, [visibleTransactions, visibleAccounts, accounts, categories, recurringIds, memberShare, transferIds]);

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
      if (transferIds.has(t.id)) return; // skip internal transfers
      const acc = accounts.find(a => a.id === t.accountId);
      // Honor the account's role: epargne / investissement / professionnel
      // outflows are not real expenses, don't count them in the analysis.
      if (acc && !accountCountsAsExpense(acc.role)) return;
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
  }, [visibleTransactions, categories, currentMonth, monthlyEvolution, accounts, memberShare, transferIds]);

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

  // Override the auto-detected internal-transfer flag for a single tx.
  // Tri-state: true = force-transfer, false = force-not-transfer, null =
  // defer to auto-detection. Persisted to the backend via PUT /transactions.
  const setTransferOverride = async (txId, value) => {
    setTransactions(prev => prev.map(t => t.id === txId ? { ...t, isTransferOverride: value } : t));
    try { await api.transactions.update(txId, { is_transfer_override: value }); }
    catch (err) { showToast('Erreur : ' + err.message, 'error'); }
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

  // Patch a single field on an account (e.g. role). Used by the Settings UI
  // when the user re-classifies a freshly-imported account.
  const updateAccount = async (accId, patch) => {
    const acc = accounts.find(a => a.id === accId);
    if (!acc) return;
    const merged = { ...acc, ...patch };
    try {
      const saved = await api.accounts.update(accId, accountToApi(merged));
      const mapped = accountFromApi(saved);
      setAccounts(prev => prev.map(a => a.id === accId ? mapped : a));
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
  // Multi-currency: convert from the source currency (per-account/asset, default
  // EUR) to the user's chosen base before formatting. Rates come from Frankfurter
  // and are cached for 1h; when rates aren't loaded yet we no-op the conversion.
  const fmt = useCallback(
    (v, opts = {}) => {
      if (hideAmounts) return '••••';
      const from = opts.from || opts.currency || 'EUR';
      const converted = convertCurrency(v, from, baseCurrency, rates);
      // Always display in the user's base currency, with the locale matching it.
      return formatCurrency(converted, { ...opts, currency: baseCurrency });
    },
    [hideAmounts, baseCurrency, rates]
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
            <div className="brand-mark">T</div>
            <div className="brand-text">
              <div className="brand-name">{APP_NAME}</div>
              <div className="brand-tagline">Patrimoine familial</div>
            </div>
          </div>

          <nav className="sidebar-nav">
            <div className="sidebar-section">Vue d'ensemble</div>
            <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}><Activity size={15}/> <span>{t('nav.dashboard')}</span></button>
            <button onClick={() => setView('wealth')} className={view === 'wealth' ? 'active' : ''}><Landmark size={15}/> <span>{t('nav.wealth')}</span></button>
            <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'active' : ''}><BarChart3 size={15}/> <span>{t('nav.transactions')}</span></button>
            <button onClick={() => setView('analysis')} className={view === 'analysis' ? 'active' : ''}><TrendingUp size={15}/> <span>Analyse</span></button>

            <div className="sidebar-section">Gestion</div>
            <button onClick={() => setView('monthly')} className={view === 'monthly' ? 'active' : ''}>
              <Calendar size={15}/> <span>{t('nav.monthly')}</span>
              {budgetsOverCount > 0 && <span className="nav-alert-dot" title={`${budgetsOverCount} budget${budgetsOverCount > 1 ? 's' : ''} dépassé${budgetsOverCount > 1 ? 's' : ''}`}>{budgetsOverCount}</span>}
            </button>
            <button onClick={() => setView('budgets')} className={view === 'budgets' ? 'active' : ''}><Target size={15}/> <span>Budgets &amp; objectifs</span></button>
            <button onClick={() => setView('cashflow')} className={view === 'cashflow' ? 'active' : ''}><ArrowUpDown size={15}/> <span>Cashflow</span></button>
            <button onClick={() => setView('tax')} className={view === 'tax' ? 'active' : ''}><Calculator size={15}/> <span>{t('nav.tax')}</span></button>

            <div className="sidebar-section">Configuration</div>
            <button onClick={() => setView('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={15}/> <span>{t('nav.settings')}</span></button>
          </nav>

          <div className="sidebar-footer">
            {currentUser && (
              <button
                className="sidebar-member-switcher"
                onClick={() => setSidebarMenuOpen(o => !o)}
                title={currentUser.email}
              >
                <div className="sidebar-user-avatar">
                  {(currentUser.full_name || currentUser.email || '?')[0].toUpperCase()}
                </div>
                <div className="sidebar-user-info">
                  <div className="sidebar-user-name">{currentUser.full_name || currentUser.email.split('@')[0]}</div>
                  <div className="sidebar-user-email">{members.length > 1 ? `+ ${members.length - 1} membre${members.length > 2 ? 's' : ''}` : 'Foyer'}</div>
                </div>
                <ChevronUp size={14} className="sidebar-user-chevron"/>
              </button>
            )}
            {sidebarMenuOpen && (
              <div className="sidebar-popover">
                <button onClick={() => { setHideAmounts(!hideAmounts); setSidebarMenuOpen(false); }}>
                  {hideAmounts ? <Eye size={14}/> : <EyeOff size={14}/>}
                  <span>{hideAmounts ? 'Afficher les montants' : 'Masquer les montants'}</span>
                </button>
                <div className="sidebar-popover-row">
                  <span style={{ fontSize: 12, color: 'var(--text-tertiary)', flex: 1 }}>Langue</span>
                  <LangButton />
                </div>
                <button onClick={() => { logout(); setSidebarMenuOpen(false); }} className="sidebar-popover-danger">
                  <LogOut size={14}/>
                  <span>Déconnexion</span>
                </button>
              </div>
            )}
          </div>
        </aside>

        <div className="app-main">
          {/* Mobile-only top bar (<1024px) */}
          <header className="app-header-mobile">
            <button className="icon-btn hamburger-btn" onClick={() => setNavOpen(true)} title="Menu">
              <Menu size={20}/>
            </button>
            <div className="brand" onClick={() => setView('dashboard')}>
              <div className="brand-mark">T</div>
              <div className="brand-name">{APP_NAME}</div>
            </div>
            <div className="header-actions">
              <button className="icon-btn" onClick={() => setHideAmounts(!hideAmounts)} title="Masquer/afficher">
                {hideAmounts ? <EyeOff size={16}/> : <Eye size={16}/>}
              </button>
              <button className="primary-btn" onClick={() => { setView('import'); setImportStep('upload'); }}>
                <Upload size={14}/> <span>{t('nav.import')}</span>
              </button>
            </div>
          </header>

          {members.length > 1 && (
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
            </div>
          )}

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
            goals={goals} budgets={budgets} wealthHistory={wealthHistory}
            recurringGroups={recurringGroups} currentMonth={currentMonth}
            transferIds={transferIds} transferPairs={transferPairs}
            setView={setView}
            onAccountClick={(a) => setDrawerAccount(a)}
            baseCurrency={baseCurrency} rates={rates}
          />
        )}
        {['monthly','cashflow','budgets'].includes(view) && (
          <div className="monthly-hub">
            <nav className="hub-tabs">
              <button onClick={() => setView('monthly')}   className={view === 'monthly'   ? 'active' : ''}><Calendar  size={13}/> <span>{t('hub.monthlyTab')}</span></button>
              <button onClick={() => setView('cashflow')}  className={view === 'cashflow'  ? 'active' : ''}><Activity  size={13}/> <span>{t('hub.cashflowTab')}</span></button>
              <button onClick={() => setView('budgets')}   className={view === 'budgets'   ? 'active' : ''}>
                <Target size={13}/> <span>{t('hub.budgetsTab')}</span>
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
            members={members}
            recurringIds={recurringIds} toggleRecurring={toggleRecurring}
            transferIds={transferIds} setTransferOverride={setTransferOverride}
            updateCategory={updateTransactionCategory} deleteTransaction={deleteTransaction} fmt={fmt}
            initialAccountFilter={txInitialAccountFilter}
            onConsumeInitialFilter={() => setTxInitialAccountFilter(null)}
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
            updateAccount={updateAccount}
            transactions={visibleTransactions}
            exportData={exportData} importData={importData} resetAllData={resetAllData}
            categories={categories}
            fmt={fmt}
            baseCurrency={baseCurrency} setBaseCurrency={setBaseCurrency}
            rates={rates} ratesDate={ratesDate}
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

      {/* Mobile nav drawer — slide in from left */}
      {navOpen && (
        <div className="nav-drawer-overlay" onClick={() => setNavOpen(false)}>
          <aside className="nav-drawer" onClick={e => e.stopPropagation()}>
            <div className="nav-drawer-header">
              <div className="sidebar-brand" style={{padding:'0 0 0 4px', cursor:'default'}}>
                <div className="brand-mark">T</div>
                <div className="brand-name">{APP_NAME}</div>
              </div>
              <button className="icon-btn" onClick={() => setNavOpen(false)}><X size={18}/></button>
            </div>
            <nav className="sidebar-nav" style={{flex:1}}>
              {[
                { v: 'dashboard', icon: <Activity size={16}/>, label: t('nav.dashboard') },
                { v: 'wealth',    icon: <Landmark size={16}/>,  label: t('nav.wealth') },
                { v: 'monthly',   icon: <Calendar size={16}/>,  label: t('nav.monthly'), badge: budgetsOverCount },
                { v: 'transactions', icon: <BarChart3 size={16}/>, label: t('nav.transactions') },
                { v: 'tax',       icon: <Calculator size={16}/>, label: t('nav.tax') },
                { v: 'settings',  icon: <Settings size={16}/>,  label: t('nav.settings') },
              ].map(({ v, icon, label, badge }) => (
                <button key={v}
                  className={view === v || (v === 'monthly' && ['monthly','cashflow','budgets'].includes(view)) ? 'active' : ''}
                  onClick={() => { setView(v); setNavOpen(false); }}>
                  {icon} <span>{label}</span>
                  {badge > 0 && <span className="nav-alert-dot">{badge}</span>}
                </button>
              ))}
            </nav>
            <div className="nav-drawer-footer">
              {currentUser && (
                <div className="sidebar-user">
                  <div className="sidebar-user-avatar">{(currentUser.full_name || currentUser.email || '?')[0].toUpperCase()}</div>
                  <div className="sidebar-user-info">
                    <div className="sidebar-user-name">{currentUser.full_name || currentUser.email}</div>
                    <div className="sidebar-user-email">{currentUser.email}</div>
                  </div>
                </div>
              )}
              <div style={{display:'flex', gap:6, marginTop:8}}>
                <LangButton />
                <button className="icon-btn" onClick={() => { setHideAmounts(!hideAmounts); }} title="Masquer/afficher">{hideAmounts ? <EyeOff size={16}/> : <Eye size={16}/>}</button>
                <button className="icon-btn" onClick={logout} title="Déconnexion"><LogOut size={16}/></button>
              </div>
            </div>
          </aside>
        </div>
      )}

      {/* Mobile bottom nav (<768px) — fixed bottom bar */}
      <nav className="bottom-nav">
        <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'active' : ''}><Activity size={18}/> <span>{t('nav.dashboard')}</span></button>
        <button onClick={() => setView('wealth')} className={view === 'wealth' ? 'active' : ''}><Landmark size={18}/> <span>{t('nav.wealth')}</span></button>
        <button onClick={() => setView('monthly')} className={['monthly','cashflow','budgets'].includes(view) ? 'active' : ''}>
          <Calendar size={18}/> <span>{t('nav.monthlyShort')}</span>
          {budgetsOverCount > 0 && <span className="nav-alert-dot">{budgetsOverCount}</span>}
        </button>
        <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'active' : ''}><BarChart3 size={18}/> <span>{t('nav.transactionsShort')}</span></button>
        <button onClick={() => setView('tax')} className={view === 'tax' ? 'active' : ''}><Calculator size={18}/> <span>{t('nav.tax')}</span></button>
        <button onClick={() => setView('settings')} className={view === 'settings' ? 'active' : ''}><Settings size={18}/> <span>{t('nav.settings')}</span></button>
      </nav>

      {drawerAccount && (
        <AccountDrawer
          account={drawerAccount}
          transactions={transactions}
          members={members}
          accountBalance={accountBalances[drawerAccount.id] || 0}
          fmt={fmt}
          onClose={() => setDrawerAccount(null)}
          onSeeAll={(accountId) => {
            setDrawerAccount(null);
            setTxInitialAccountFilter(accountId);
            setView('transactions');
          }}
        />
      )}
    </div>
  );
}

