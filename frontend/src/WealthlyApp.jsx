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
import { useQuotes } from './hooks/useQuotes.js';
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
import { Admin } from './views/Admin.jsx';
import { ImportFlow } from './views/ImportFlow.jsx';
import { AccountDrawer } from './components/AccountDrawer.jsx';
import { useTheme, ThemeToggle } from './components/ui/ThemeToggle.jsx';

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
  const [theme] = useTheme();
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

  // Live investment quotes — derive the unique ticker list from assets and
  // hand it to useQuotes. Yahoo Finance via /quotes endpoint (5-min cache).
  const tickerList = useMemo(
    () => assets.map(a => a.ticker).filter(Boolean),
    [assets]
  );
  const { quotes: liveQuotes } = useQuotes(tickerList);

  // Banking sync state
  const [bankConnections, setBankConnections] = useState([]);
  const [bankingPendingState, setBankingPendingState] = useState(null); // state param from callback URL

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
    currency: a.currency || 'EUR',
    memberIds: a.member_ids || [],
    currentBalance: a.current_balance,
  });
  const accountToApi = (a) => ({
    name: a.name,
    bank: a.bank,
    type: a.type,
    role: a.role || 'principal',
    initial_balance: parseFloat(a.initialBalance) || 0,
    currency: a.currency || 'EUR',
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
    currency: a.currency || 'EUR',
    ticker: a.ticker || '',
    quantity: a.quantity ?? null,
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
      currency: a.currency || 'EUR',
      ticker: (a.ticker || '').trim().toUpperCase() || null,
      quantity: numOrNull(a.quantity),
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
    currency: l.currency || 'EUR',
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
    currency: l.currency || 'EUR',
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
      const [memList, accList, txList, astList, liaList, catList, budList, goalList, achList, ruleList, connList] = await Promise.all([
        api.members.list(),
        api.accounts.list(),
        api.transactions.list(),
        api.assets.list(),
        api.liabilities.list(),
        api.categories.list(),
        api.budgets.list(),
        api.goals.list(),
        api.rules.list(),
        api.banking.listConnections().catch(() => []),
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
      setGoals((goalList || []).map(goalFromApi));
      setAchievements((achList || []).map(a => a.achievement_slug));
      // Custom rules
      setCustomRules((ruleList || []).map(r => ({ pattern: r.pattern, categoryId: r.category_slug, source: r.source, _id: r.id })));
      setBankConnections(connList || []);
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
      setLoading(false);

      // Handle Enable Banking callback: URL contains ?state=xxx after bank OAuth
      const urlParams = new URLSearchParams(window.location.search);
      const stateParam = urlParams.get('state');
      if (stateParam) {
        setBankingPendingState(stateParam);
        // Clean up URL without reload
        window.history.replaceState({}, '', window.location.pathname);
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
  // Live-pricing pass: when an asset has a ticker + quantity AND we have a
  // quote for it, override its currentValue with quantity × livePrice.
  // We also surface livePrice / changePct / liveCurrency on the asset object
  // so views can render the "Live" badge and daily change badge.
  const livePricedAssets = useMemo(() => assets.map(a => {
    const t = (a.ticker || '').trim().toUpperCase();
    const qty = parseFloat(a.quantity);
    if (!t || !qty || !liveQuotes || !liveQuotes[t]) return a;
    const q = liveQuotes[t];
    return {
      ...a,
      currentValue: q.price * qty,
      currency: q.currency || a.currency || 'EUR',
      _livePrice: q.price,
      _liveChangePct: q.changePct,
      _liveAt: q.fetchedAt,
    };
  }), [assets, liveQuotes]);

  const visibleAssets = useMemo(() => activeMemberId === 'all' ? livePricedAssets : livePricedAssets.filter(a => (a.memberIds || []).includes(activeMemberId)), [livePricedAssets, activeMemberId]);
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

  // ===== Banking / Enable Banking =====
  const completeBankCallback = useCallback(async (state) => {
    try {
      const result = await api.banking.complete(state);
      setBankingPendingState(null);
      if (result.status === 'authorized') {
        showToast('🏦 Banque connectée ! Vous pouvez maintenant synchroniser vos transactions.', 'success');
        const conns = await api.banking.listConnections();
        setBankConnections(conns);
      } else {
        showToast('En attente d\'autorisation bancaire...', 'info');
      }
    } catch (err) {
      setBankingPendingState(null);
      showToast('Erreur connexion bancaire : ' + err.message, 'error');
    }
  }, []);

  // Auto-complete when bankingPendingState is set (after URL callback detection)
  useEffect(() => {
    if (bankingPendingState && !loading) {
      completeBankCallback(bankingPendingState);
    }
  }, [bankingPendingState, loading, completeBankCallback]);

  const syncBankConnection = async (connectionId) => {
    try {
      showToast('⏳ Synchronisation en cours...', 'info');
      const result = await api.banking.sync(connectionId);
      showToast(`✅ ${result.imported} nouvelles transactions importées`, 'success');
      await reloadAll();
      if (result.imported > 0) unlockAchievement('first_import');
    } catch (err) {
      showToast('Erreur sync : ' + err.message, 'error');
    }
  };

  const deleteBankConnection = async (connectionId) => {
    if (!confirm('Déconnecter cette banque ?')) return;
    try {
      await api.banking.deleteConnection(connectionId);
      setBankConnections(prev => prev.filter(c => c.id !== connectionId));
      showToast('Connexion bancaire supprimée', 'info');
    } catch (err) {
      showToast('Erreur : ' + err.message, 'error');
    }
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

  const logout = async () => {
    if (!confirm('Se déconnecter ?')) return;
    // Tell the backend to clear the HttpOnly auth cookie. We also wipe the
    // legacy localStorage token so users coming from before the cookie
    // migration get a clean slate.
    try { await api.auth.logout(); } catch { /* ignore — we still wipe locally */ }
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
        {/* Desktop sidebar (≥1024px) — Wealthly v3 handoff spec */}
        <aside className="ws-sidebar">
          <div className="ws-brand" onClick={() => setView('dashboard')}>
            <div className="ws-brand-mark">W</div>
            <div>
              <div className="ws-brand-name">{APP_NAME}</div>
              <div className="ws-brand-sub">Patrimoine personnel</div>
            </div>
          </div>

          <div className="ws-search">
            <Search size={14} />
            <input placeholder="Rechercher" />
            <kbd className="ws-kbd">⌘K</kbd>
          </div>

          <nav className="ws-nav">
            <div className="ws-nav-group">Pilotage</div>
            <button onClick={() => setView('dashboard')} className={view === 'dashboard' ? 'on' : ''}>
              <Activity size={16}/> <span>Vue d'ensemble</span>
            </button>
            <button onClick={() => setView('wealth')} className={view === 'wealth' ? 'on' : ''}>
              <Landmark size={16}/> <span>Patrimoine</span>
            </button>
            <button onClick={() => setView('transactions')} className={view === 'transactions' ? 'on' : ''}>
              <BarChart3 size={16}/> <span>Transactions</span>
            </button>
            <button onClick={() => setView('analysis')} className={view === 'analysis' ? 'on' : ''}>
              <TrendingUp size={16}/> <span>Performance</span>
            </button>

            <div className="ws-nav-group">Gestion</div>
            <button onClick={() => setView('monthly')} className={view === 'monthly' ? 'on' : ''}>
              <Calendar size={16}/> <span>Budget mensuel</span>
              {budgetsOverCount > 0 && <span className="ws-badge">{budgetsOverCount}</span>}
            </button>
            <button onClick={() => setView('budgets')} className={view === 'budgets' ? 'on' : ''}>
              <Target size={16}/> <span>Objectifs</span>
            </button>
            <button onClick={() => setView('cashflow')} className={view === 'cashflow' ? 'on' : ''}>
              <ArrowUpDown size={16}/> <span>Cashflow</span>
            </button>
            <button onClick={() => setView('tax')} className={view === 'tax' ? 'on' : ''}>
              <Calculator size={16}/> <span>Fiscalité</span>
            </button>

            <div className="ws-nav-group">Comptes</div>
            {(accounts || []).slice(0, 4).map(a => (
              <button key={a.id} onClick={() => setDrawerAccount(a)} className="ws-account-item">
                <span className="ws-bank-dot" style={{ background: bankColor(a.bank) }}>
                  {(a.bank || a.name || '?')[0].toUpperCase()}
                </span>
                <span>{a.bank || a.name}</span>
              </button>
            ))}
            <button onClick={() => setView('settings')} className="ws-add-btn">
              <Plus size={14}/> <span>Ajouter</span>
            </button>

            <div className="ws-nav-group">Configuration</div>
            <button onClick={() => setView('settings')} className={view === 'settings' ? 'on' : ''}>
              <Settings size={16}/> <span>Réglages</span>
            </button>
            {currentUser?.is_admin && (
              <button onClick={() => setView('admin')} className={view === 'admin' ? 'on' : ''}>
                <Lock size={16}/> <span>Admin</span>
              </button>
            )}
          </nav>

          <div className="ws-foot">
            <div className="ws-foot-actions">
              <ThemeToggle/>
              <LangButton/>
              <button className="ds-icon-btn" onClick={() => setHideAmounts(!hideAmounts)}
                      title={hideAmounts ? 'Afficher les montants' : 'Masquer les montants'}>
                {hideAmounts ? <EyeOff size={15}/> : <Eye size={15}/>}
              </button>
            </div>
            {currentUser && (
              <button className="ws-user" onClick={() => setSidebarMenuOpen(o => !o)} title={currentUser.email}>
                <div className="ws-user-avatar">
                  {(currentUser.full_name || currentUser.email || '?')[0].toUpperCase()}
                </div>
                <div className="ws-user-info">
                  <div className="ws-user-name">{currentUser.full_name || currentUser.email.split('@')[0]}</div>
                  <div className="ws-user-meta">
                    {currentUser.plan || 'Gratuit'} · <span style={{ color: 'var(--positive)' }}>DSP2 ✓</span>
                  </div>
                </div>
                <ChevronUp size={13} style={{ color: 'var(--ink-3)' }}/>
              </button>
            )}
            {sidebarMenuOpen && (
              <div className="ws-popover">
                <button onClick={() => { logout(); setSidebarMenuOpen(false); }} className="ws-popover-danger">
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
            currentUser={currentUser}
          />
        )}
        {['monthly','cashflow','budgets'].includes(view) && (
          <div className="monthly-hub">
            {/* Hub tabs supprimées : la navigation Monthly / Cashflow / Budgets
                vit déjà dans la sidebar (groupe Gestion), pas de doublon. */}
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
            bankConnections={bankConnections}
            syncBankConnection={syncBankConnection}
            deleteBankConnection={deleteBankConnection}
            fmt={fmt}
            baseCurrency={baseCurrency} setBaseCurrency={setBaseCurrency}
            rates={rates} ratesDate={ratesDate}
          />
        )}
        {view === 'admin' && currentUser?.is_admin && (
          <Admin />
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
function Wealth({ assets, liabilities, members, activeMemberId, visibleAssets, visibleLiabilities, saveAsset, deleteAsset, saveLiability, deleteLiability, memberShare, fmt }) {
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
function SettingsView({ members, accounts, accountBalances, saveMember, deleteMember, deleteAccount, achievements, exportData, importData, resetAllData, bankConnections, syncBankConnection, deleteBankConnection, fmt }) {
  const [editingMember, setEditingMember] = useState(null);
  const [showBankModal, setShowBankModal] = useState(false);
  const COLORS = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444'];

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

      {/* ── Bank Sync (Enable Banking) ── */}
      <section className="card">
        <div className="card-header">
          <h3><Cloud size={16}/> Synchro bancaire</h3>
          <button className="primary-btn" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setShowBankModal(true)}>
            <Plus size={13}/> Connecter une banque
          </button>
        </div>
        {bankConnections.length === 0 ? (
          <div className="empty-mini">
            <RefreshCw size={24}/>
            <p>Aucune banque connectée. Connectez votre banque pour importer vos transactions automatiquement.</p>
            <button className="primary-btn" style={{ marginTop: 8 }} onClick={() => setShowBankModal(true)}>
              Connecter ma banque
            </button>
          </div>
        ) : (
          <div className="member-list">
            {bankConnections.map(conn => (
              <div key={conn.id} className="member-card">
                <span className="member-avatar large" style={{ background: conn.status === 'authorized' ? '#10b981' : conn.status === 'error' ? '#ef4444' : '#f59e0b' }}>
                  {conn.bank_name.charAt(0)}
                </span>
                <div className="member-card-info">
                  <div className="member-card-name">{conn.bank_name}</div>
                  <div className="member-card-role">
                    {conn.status === 'authorized' ? '✅ Connecté' : conn.status === 'error' ? '❌ Erreur' : '⏳ En attente'}
                    {conn.last_synced_at && ` · Synchro ${new Date(conn.last_synced_at).toLocaleDateString('fr-FR')}`}
                    {conn.accounts?.length > 0 && ` · ${conn.accounts.length} compte(s)`}
                  </div>
                  {conn.error_message && <div style={{ fontSize: 11, color: 'var(--danger-text)', marginTop: 2 }}>{conn.error_message}</div>}
                </div>
                {conn.status === 'authorized' && (
                  <button className="secondary-btn" style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }} onClick={() => syncBankConnection(conn.id)}>
                    <RefreshCw size={12}/> Sync
                  </button>
                )}
                <button className="icon-btn-sm" onClick={() => deleteBankConnection(conn.id)}><Trash2 size={13}/></button>
              </div>
            ))}
          </div>
        )}
        <div className="settings-info" style={{ marginTop: 8 }}>
          <Lightbulb size={14}/>
          <span>Connexion sécurisée via <strong>Enable Banking</strong> (PSD2 open banking). Vos identifiants bancaires ne transitent pas par Wealthly.</span>
        </div>
      </section>

      {showBankModal && (
        <BankConnectModal
          onClose={() => setShowBankModal(false)}
        />
      )}

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

      {editingMember && <MemberEditor member={editingMember} onSave={(m) => { saveMember(m); setEditingMember(null); }} onCancel={() => setEditingMember(null)}/>}
    </div>
  );
}

function MemberEditor({ member, onSave, onCancel }) {
  const [draft, setDraft] = useState(member);
  const COLORS = ['#3b82f6', '#10b981', '#f97316', '#ec4899', '#8b5cf6', '#06b6d4', '#f59e0b', '#ef4444'];
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
// BANK CONNECT MODAL
// ============================================================================
function BankConnectModal({ onClose }) {
  const [step, setStep] = useState('country'); // country → list → redirect
  const [country, setCountry] = useState('FR');
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const COUNTRIES = [
    { code: 'FR', name: '🇫🇷 France' },
    { code: 'DE', name: '🇩🇪 Allemagne' },
    { code: 'ES', name: '🇪🇸 Espagne' },
    { code: 'IT', name: '🇮🇹 Italie' },
    { code: 'BE', name: '🇧🇪 Belgique' },
    { code: 'NL', name: '🇳🇱 Pays-Bas' },
    { code: 'PT', name: '🇵🇹 Portugal' },
    { code: 'GB', name: '🇬🇧 Royaume-Uni' },
  ];

  const loadBanks = async () => {
    setLoadingBanks(true);
    setError(null);
    try {
      const data = await api.banking.listBanks(country);
      const list = data.banks || data || [];
      setBanks(Array.isArray(list) ? list : []);
      setStep('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBanks(false);
    }
  };

  const connectBank = async (bankName) => {
    setConnecting(true);
    setError(null);
    try {
      const result = await api.banking.connect(bankName, country);
      if (result.redirect_url) {
        // Redirect user to bank authentication page
        window.location.href = result.redirect_url;
      } else {
        setError('Pas d\'URL de redirection reçue');
        setConnecting(false);
      }
    } catch (err) {
      setError(err.message);
      setConnecting(false);
    }
  };

  const filteredBanks = banks.filter(b => {
    const name = b.name || b.full_name || '';
    return name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏦 Connecter ma banque</h2>
          <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        {step === 'country' && (
          <div className="modal-body">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Connexion sécurisée via Enable Banking (PSD2). Vos identifiants restent sur le site de votre banque.
            </p>
            <label>
              <span>Pays de votre banque</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
            {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
            <div className="modal-footer">
              <button className="secondary-btn" onClick={onClose}>Annuler</button>
              <button className="primary-btn" onClick={loadBanks} disabled={loadingBanks}>
                {loadingBanks ? '⏳ Chargement…' : 'Voir les banques →'}
              </button>
            </div>
          </div>
        )}

        {step === 'list' && (
          <div className="modal-body">
            <input
              className="search-input"
              placeholder="Chercher votre banque…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
              autoFocus
            />
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredBanks.length === 0 && (
                <div className="empty-mini" style={{ padding: 20 }}>
                  {banks.length === 0 ? 'Aucune banque disponible pour ce pays' : 'Aucun résultat'}
                </div>
              )}
              {filteredBanks.map((bank, idx) => {
                const bankName = bank.name || bank.full_name || `Banque ${idx}`;
                return (
                  <button
                    key={idx}
                    className="bank-option-btn"
                    onClick={() => connectBank(bankName)}
                    disabled={connecting}
                  >
                    <span className="bank-initial">{bankName.charAt(0).toUpperCase()}</span>
                    <span className="bank-option-name">{bankName}</span>
                    {connecting ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>⏳</span> : <ChevronRight size={14}/>}
                  </button>
                );
              })}
            </div>
            {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
            <div style={{ marginTop: 12 }}>
              <button className="secondary-btn" style={{ width: '100%' }} onClick={() => setStep('country')}>← Changer de pays</button>
            </div>
          </div>
        )}
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
  --bg-page: ${dark ? '#0a0d14' : '#fafbfc'};
  --bg-card: ${dark ? '#141821' : '#ffffff'};
  --bg-card-hover: ${dark ? '#1a1f2b' : '#f9fafb'};
  --bg-subtle: ${dark ? '#0f131c' : '#f1f5f9'};
  --text-primary: ${dark ? '#f1f5f9' : '#0f172a'};
  --text-secondary: ${dark ? '#cbd5e1' : '#475569'};
  --text-tertiary: ${dark ? '#64748b' : '#94a3b8'};
  --border: ${dark ? '#1f2533' : '#e2e8f0'};
  --border-light: ${dark ? '#1a1f2b' : '#f1f5f9'};
  --border-strong: ${dark ? '#2d3548' : '#cbd5e1'};
  --primary: #3b82f6;
  --primary-hover: #2563eb;
  --primary-soft: ${dark ? 'rgba(30, 58, 138, 0.3)' : '#dbeafe'};
  --primary-text: ${dark ? '#93c5fd' : '#1e40af'};
  --success: #10b981;
  --success-soft: ${dark ? 'rgba(6, 64, 43, 0.5)' : '#d1fae5'};
  --success-text: ${dark ? '#6ee7b7' : '#047857'};
  --danger: #ef4444;
  --danger-soft: ${dark ? 'rgba(76, 20, 20, 0.5)' : '#fee2e2'};
  --danger-text: ${dark ? '#fca5a5' : '#991b1b'};
  --warning: #f59e0b;
  --warning-soft: ${dark ? 'rgba(69, 26, 3, 0.5)' : '#fef3c7'};
  --warning-text: ${dark ? '#fcd34d' : '#92400e'};
  --purple: #8b5cf6;
  --purple-soft: ${dark ? 'rgba(59, 7, 100, 0.5)' : '#ede9fe'};
  --shadow-sm: 0 1px 2px 0 rgba(0,0,0,${dark ? '0.4' : '0.05'});
  --shadow-md: 0 4px 6px -1px rgba(0,0,0,${dark ? '0.4' : '0.07'});
  --shadow-lg: 0 10px 15px -3px rgba(0,0,0,${dark ? '0.5' : '0.08'});
  --shadow-xl: 0 20px 25px -5px rgba(0,0,0,${dark ? '0.5' : '0.08'});
  --gradient-hero: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  --gradient-success: linear-gradient(135deg, #10b981 0%, #14b8a6 100%);
}
* { box-sizing: border-box; }
.app { font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif; background: var(--bg-page); color: var(--text-primary); min-height: 100vh; letter-spacing: -0.01em; -webkit-font-smoothing: antialiased; }

.loading-screen { min-height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 16px; background: var(--bg-page); color: var(--text-secondary); }
.spinner { width: 32px; height: 32px; border: 2.5px solid var(--border); border-top-color: var(--primary); border-radius: 50%; animation: spin 0.8s linear infinite; }
@keyframes spin { to { transform: rotate(360deg); } }

/* HEADER */
.app-header { display: flex; align-items: center; justify-content: space-between; padding: 14px 24px; border-bottom: 1px solid var(--border); position: sticky; top: 0; z-index: 100; backdrop-filter: blur(12px); background: ${dark ? 'rgba(20, 24, 33, 0.85)' : 'rgba(255, 255, 255, 0.85)'}; gap: 12px; flex-wrap: wrap; }
.brand { display: flex; align-items: center; gap: 12px; cursor: pointer; }
.brand:hover { opacity: 0.85; }
.brand-mark { width: 36px; height: 36px; border-radius: 10px; background: var(--gradient-hero); display: flex; align-items: center; justify-content: center; color: white; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
.brand-text { display: flex; flex-direction: column; line-height: 1.1; }
.brand-name { font-size: 17px; font-weight: 700; letter-spacing: -0.025em; }
.brand-tagline { font-size: 10px; color: var(--text-tertiary); font-weight: 500; text-transform: uppercase; letter-spacing: 0.06em; margin-top: 1px; }
.main-nav { display: flex; gap: 2px; background: var(--bg-subtle); padding: 4px; border-radius: 12px; overflow-x: auto; }
.main-nav button { display: inline-flex; align-items: center; gap: 5px; padding: 7px 12px; border: none; background: transparent; color: var(--text-secondary); font-size: 13px; font-weight: 500; border-radius: 8px; cursor: pointer; transition: all 0.15s; font-family: inherit; white-space: nowrap; }
.main-nav button:hover { background: var(--bg-card); color: var(--text-primary); }
.main-nav button.active { background: var(--bg-card); color: var(--primary); box-shadow: var(--shadow-sm); }
.header-actions { display: flex; align-items: center; gap: 8px; }
.icon-btn { display: inline-flex; align-items: center; justify-content: center; width: 36px; height: 36px; border-radius: 10px; background: var(--bg-subtle); border: 1px solid var(--border); color: var(--text-secondary); cursor: pointer; transition: all 0.15s; }
.icon-btn:hover { background: var(--bg-card-hover); color: var(--text-primary); }
.icon-btn-sm { display: inline-flex; align-items: center; justify-content: center; width: 28px; height: 28px; border-radius: 6px; background: transparent; border: 1px solid transparent; color: var(--text-tertiary); cursor: pointer; transition: all 0.15s; }
.icon-btn-sm:hover { background: var(--bg-subtle); color: var(--text-primary); }

.primary-btn, .primary-btn-large, .secondary-btn, .danger-btn, .danger-btn-sm { display: inline-flex; align-items: center; gap: 6px; padding: 8px 14px; border-radius: 10px; font-size: 13px; font-weight: 600; cursor: pointer; transition: all 0.15s; border: 1px solid transparent; font-family: inherit; }
.primary-btn { background: var(--primary); color: white; }
.primary-btn:hover { background: var(--primary-hover); transform: translateY(-1px); box-shadow: 0 4px 12px rgba(59, 130, 246, 0.25); }
.primary-btn:disabled { opacity: 0.5; cursor: not-allowed; transform: none; box-shadow: none; }
.primary-btn-large { background: var(--gradient-hero); color: white; padding: 12px 24px; font-size: 14px; box-shadow: 0 4px 12px rgba(59, 130, 246, 0.3); }
.primary-btn-large:hover { transform: translateY(-2px); box-shadow: 0 8px 20px rgba(59, 130, 246, 0.4); }
.secondary-btn { background: var(--bg-card); border: 1px solid var(--border); color: var(--text-primary); }
.secondary-btn:hover { background: var(--bg-card-hover); border-color: var(--border-strong); }
.danger-btn { background: var(--danger-soft); color: var(--danger-text); }
.danger-btn:hover { background: var(--danger); color: white; }
.danger-btn-sm { padding: 5px 9px; background: var(--danger-soft); color: var(--danger-text); font-size: 12px; }
.link-btn { background: transparent; border: none; color: var(--primary); font-size: 12px; font-weight: 600; cursor: pointer; display: inline-flex; align-items: center; gap: 2px; padding: 4px 8px; border-radius: 6px; }
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

input, select, textarea { font-family: inherit; font-size: 13px; padding: 8px 12px; border-radius: 8px; border: 1px solid var(--border); background: var(--bg-card); color: var(--text-primary); transition: all 0.15s; }
input:focus, select:focus, textarea:focus { outline: none; border-color: var(--primary); box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1); }
label { display: flex; flex-direction: column; gap: 6px; font-size: 12px; color: var(--text-secondary); font-weight: 600; }
.field-row { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
.field-help { font-size: 11px; color: var(--text-tertiary); margin-top: -4px; }
.hint { font-weight: 400; color: var(--text-tertiary); }

/* ONBOARDING */
.onboarding { min-height: 100vh; display: flex; align-items: center; justify-content: center; background: var(--bg-page); padding: 32px 16px; color: var(--text-primary); position: relative; overflow: hidden; }
.onboarding-bg-mesh { position: absolute; inset: 0; background: radial-gradient(circle at 15% 20%, rgba(59, 130, 246, 0.12), transparent 40%), radial-gradient(circle at 85% 80%, rgba(139, 92, 246, 0.10), transparent 40%); pointer-events: none; }
.onboarding-card { background: var(--bg-card); border-radius: 24px; padding: 40px; max-width: 720px; width: 100%; box-shadow: var(--shadow-xl); border: 1px solid var(--border); position: relative; z-index: 1; }
.onboarding-progress { display: flex; align-items: center; gap: 8px; margin-bottom: 32px; }
.progress-step { display: flex; align-items: center; gap: 8px; color: var(--text-tertiary); font-size: 12px; font-weight: 600; }
.progress-step.active { color: var(--primary); }
.progress-step.done { color: var(--success); }
.progress-dot { width: 26px; height: 26px; border-radius: 50%; background: var(--bg-subtle); border: 2px solid var(--border); display: inline-flex; align-items: center; justify-content: center; font-size: 11px; font-weight: 700; flex-shrink: 0; }
.progress-step.active .progress-dot { background: var(--primary); color: white; border-color: var(--primary); }
.progress-step.done .progress-dot { background: var(--success); color: white; border-color: var(--success); }
.progress-line { flex: 1; height: 2px; background: var(--border); border-radius: 1px; }
.onboarding-step-content h1 { font-size: 30px; font-weight: 800; margin: 0 0 8px; letter-spacing: -0.025em; }
.onboarding-step-content h2 { font-size: 24px; font-weight: 700; margin: 0 0 8px; letter-spacing: -0.02em; }
.onboarding-lead { font-size: 15px; color: var(--text-secondary); margin: 0 0 28px; line-height: 1.6; }
.onboarding-hero { text-align: center; margin-bottom: 32px; }
.ob-mark-large { width: 80px; height: 80px; border-radius: 22px; background: var(--gradient-hero); display: inline-flex; align-items: center; justify-content: center; color: white; margin-bottom: 20px; box-shadow: 0 12px 28px rgba(59, 130, 246, 0.35); }
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
.ready-icon { width: 80px; height: 80px; border-radius: 22px; background: var(--gradient-success); display: inline-flex; align-items: center; justify-content: center; color: white; margin-bottom: 20px; }
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
.empty-circle { width: 80px; height: 80px; border-radius: 22px; background: var(--gradient-hero); display: inline-flex; align-items: center; justify-content: center; color: white; box-shadow: 0 12px 28px rgba(59, 130, 246, 0.3); }
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

.kpi-card { position: relative; padding: 24px; border-radius: 20px; background: var(--bg-card); border: 1px solid var(--border); box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03); overflow: hidden; display: flex; flex-direction: column; gap: 6px; transition: box-shadow 0.2s; }
.kpi-card:hover { box-shadow: 0 2px 8px rgba(0,0,0,0.06), 0 8px 24px rgba(0,0,0,0.06); }
.kpi-card-label { font-size: 12px; color: var(--text-tertiary); font-weight: 600; letter-spacing: 0.02em; }
.kpi-card-value { font-size: 28px; font-weight: 800; line-height: 1.1; letter-spacing: -0.03em; font-variant-numeric: tabular-nums; margin: 2px 0 4px; }
.kpi-card-sub { display: flex; flex-wrap: wrap; gap: 10px; margin-top: 2px; }
.kpi-card-sub-item { display: inline-flex; align-items: center; gap: 5px; font-size: 11.5px; color: var(--text-tertiary); font-weight: 500; }
.kpi-dot { width: 7px; height: 7px; border-radius: 50%; flex-shrink: 0; }
.kpi-card-icon { position: absolute; top: 20px; right: 20px; width: 34px; height: 34px; border-radius: 10px; display: flex; align-items: center; justify-content: center; }
.kpi-card-icon--income { background: var(--success-soft); color: var(--success-text); }
.kpi-card-icon--expense { background: var(--danger-soft); color: var(--danger-text); }

/* Primary card: subtle gradient accent */
.kpi-card--primary { background: ${dark ? 'linear-gradient(135deg, #141821 0%, #1a1f2b 100%)' : 'linear-gradient(135deg, #ffffff 0%, #f8f9ff 100%)'}; }
.kpi-card--primary .kpi-card-value { font-size: 34px; }
.kpi-card--primary::after { content: ''; position: absolute; top: -30px; right: -30px; width: 120px; height: 120px; background: radial-gradient(circle, rgba(139,92,246,0.12), transparent 70%); pointer-events: none; }

/* Net card accent colors */
.kpi-card--positive .kpi-card-value { color: var(--success); }
.kpi-card--positive .kpi-card-icon { background: var(--success-soft); color: var(--success-text); }
.kpi-card--negative .kpi-card-value { color: var(--danger); }
.kpi-card--negative .kpi-card-icon { background: var(--danger-soft); color: var(--danger-text); }

/* CARDS */
.card { background: var(--bg-card); border: 1px solid var(--border); border-radius: 20px; padding: 24px; box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 4px 16px rgba(0,0,0,0.03); }
.card-header { display: flex; justify-content: space-between; align-items: center; gap: 12px; margin-bottom: 20px; flex-wrap: wrap; }
.card-header h3 { font-size: 14px; font-weight: 700; margin: 0; display: flex; align-items: center; gap: 6px; letter-spacing: -0.01em; }
.card-meta { font-size: 11px; color: var(--text-tertiary); font-weight: 500; }
.chart-card { padding: 20px 16px 16px 8px; }
.chart-empty { padding: 60px 20px; text-align: center; color: var(--text-tertiary); display: flex; flex-direction: column; align-items: center; gap: 12px; font-size: 13px; }
.alert-card { border-color: var(--warning); background: var(--warning-soft); }
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
.mk-card.savings-rate.positive .mk-icon { background: #d1fae5; color: #059669; }
.mk-card.savings-rate.neutral .mk-icon { background: #fef3c7; color: #d97706; }
.mk-card.savings-rate.negative .mk-icon { background: var(--danger-soft); color: var(--danger-text); }
.mk-card.savings-rate.positive .mk-value { color: var(--success); }
.mk-card.savings-rate.neutral .mk-value { color: #d97706; }
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
@media (min-width: 900px) { .monthly-grid { grid-template-columns: 1.2fr 1fr; } .recurring-card { grid-row: span 2; } }
.recurring-list-detailed { display: flex; flex-direction: column; gap: 8px; max-height: 540px; overflow-y: auto; }
.recurring-detailed-item { display: flex; align-items: center; gap: 12px; padding: 12px; border-radius: 10px; background: var(--bg-subtle); transition: all 0.15s; }
.recurring-detailed-item:hover { background: var(--bg-card-hover); transform: translateX(2px); }
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
.ratio-bar-large { display: flex; height: 56px; border-radius: 14px; overflow: hidden; box-shadow: var(--shadow-sm); }
.ratio-segment { display: flex; align-items: center; justify-content: center; transition: flex 0.6s ease; min-width: 0; }
.ratio-segment.needs { background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); }
.ratio-segment.wants { background: linear-gradient(135deg, #f97316 0%, #ea580c 100%); }
.ratio-segment.savings { background: linear-gradient(135deg, #10b981 0%, #059669 100%); }
.ratio-pct { font-size: 18px; font-weight: 800; color: white; }
.ratio-cards { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; }
.ratio-card { padding: 16px; border-radius: 12px; background: var(--bg-subtle); border: 2px solid transparent; }
.ratio-card.needs { border-color: rgba(59, 130, 246, 0.2); }
.ratio-card.wants { border-color: rgba(249, 115, 22, 0.2); }
.ratio-card.savings { border-color: rgba(16, 185, 129, 0.2); }
.ratio-card-header { display: flex; align-items: baseline; gap: 8px; margin-bottom: 8px; }
.ratio-card-pct { font-size: 28px; font-weight: 800; line-height: 1; font-variant-numeric: tabular-nums; }
.ratio-card.needs .ratio-card-pct { color: #3b82f6; }
.ratio-card.wants .ratio-card-pct { color: #f97316; }
.ratio-card.savings .ratio-card-pct { color: #10b981; }
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

/* BANK SYNC */
.bank-option-btn { display: flex; align-items: center; gap: 12px; padding: 11px 14px; background: var(--bg-subtle); border: 1px solid var(--border); border-radius: 10px; cursor: pointer; font-family: inherit; font-size: 13px; color: var(--text-primary); font-weight: 500; transition: all 0.15s; text-align: left; width: 100%; }
.bank-option-btn:hover:not(:disabled) { background: var(--primary-soft); border-color: var(--primary); color: var(--primary-text); }
.bank-option-btn:disabled { opacity: 0.6; cursor: wait; }
.bank-initial { width: 34px; height: 34px; border-radius: 9px; background: var(--primary-soft); color: var(--primary-text); display: flex; align-items: center; justify-content: center; font-weight: 800; font-size: 15px; flex-shrink: 0; }
.bank-option-name { flex: 1; }
.error-banner { background: var(--danger-soft); color: var(--danger-text); border-radius: 8px; padding: 10px 12px; font-size: 12px; font-weight: 600; }
.search-input { padding: 9px 12px; border: 1px solid var(--border); border-radius: 9px; background: var(--bg-subtle); color: var(--text-primary); font-size: 13px; font-family: inherit; outline: none; }
.search-input:focus { border-color: var(--primary); background: var(--bg-card); }
`;
  return <style>{css}</style>;
}
