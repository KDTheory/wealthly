// ============================================================================
// Dashboard — Wealthly v3 (Refonte Claude Design)
//
// Spec source: design_handoff_wealthly_dashboard/README.md (Screen 01).
// Layout : main header (Bonsoir) + Hero KPI + Allocation (grid 1.5/1)
//          + Mes comptes + Transactions/Budget/Insights (grid 2/1).
//
// Interface props préservée pour ne pas casser WealthlyApp.jsx :
// (netWorth, liquidWealth, assetsValue, liabilitiesValue, thisMonthStats,
//  monthlyEvolution, visibleAccounts, accountBalances, visibleAssets,
//  visibleLiabilities, members, activeMemberId, transactions, categories,
//  fmt, memberShare, categoryAnalysis, budgets, transferIds, setView,
//  onAccountClick)
// ============================================================================
import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import {
  Plus, Download, RefreshCw, ArrowUp, ArrowDown,
  TrendingUp, AlertTriangle, Sparkles, MoreHorizontal,
} from 'lucide-react';
import { ASSET_CLASS_MAP } from '../constants.js';
import { Amount, formatEUR } from '../components/ui/Amount.jsx';
import { BankMark } from '../components/ui/BankMark.jsx';
import { Sparkline } from '../components/ui/Sparkline.jsx';
import { Donut } from '../components/ui/Donut.jsx';

const PERIODS = [
  { id: '1m',  label: '1M',   months: 1 },
  { id: '3m',  label: '3M',   months: 3 },
  { id: '6m',  label: '6M',   months: 6 },
  { id: '1y',  label: '1A',   months: 12 },
  { id: '5y',  label: '5A',   months: 60 },
  { id: 'all', label: 'Tout', months: null },
];

const DATAVIZ = ['var(--d2)', 'var(--d1)', 'var(--d3)', 'var(--d5)', 'var(--d4)', 'var(--d6)', 'var(--d7)'];

const INITIAL = (s) => {
  if (!s) return '••';
  const t = String(s).trim().split(/\s+/);
  return ((t[0]?.[0] || '') + (t[1]?.[0] || t[0]?.[1] || '')).toUpperCase();
};

// "il y a X min" relative time pour la sync
const relTime = (d = new Date(Date.now() - 4 * 60_000)) => {
  const sec = Math.floor((Date.now() - d.getTime()) / 1000);
  if (sec < 60) return `il y a ${sec} s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `il y a ${min} min`;
  const h = Math.floor(min / 60);
  if (h < 24) return `il y a ${h} h`;
  return `il y a ${Math.floor(h / 24)} j`;
};

const greeting = (t) => {
  const h = new Date().getHours();
  if (h < 5) return t('dashboard.greetingNight');
  if (h < 12) return t('dashboard.greetingMorning');
  if (h < 18) return t('dashboard.greetingAfternoon');
  return t('dashboard.greetingEvening');
};

export function Dashboard({
  netWorth, liquidWealth, assetsValue, liabilitiesValue,
  thisMonthStats, monthlyEvolution,
  visibleAccounts, accountBalances,
  visibleAssets, visibleLiabilities,
  members, activeMemberId,
  transactions, categories, fmt, memberShare,
  categoryAnalysis = {}, anomalies = [], cashflowProjection,
  goals, budgets = {}, wealthHistory = [],
  recurringGroups, currentMonth,
  transferIds = new Set(), transferPairs = [],
  setView, onAccountClick,
  baseCurrency = 'EUR', rates = null,
  currentUser = null,
}) {
  const { t } = useTranslation();
  const [period, setPeriod] = useState('6m');
  const [txFilter, setTxFilter] = useState('all'); // all | expense | income
  const [hover, setHover] = useState(null); // chart hover point

  // ── Allocation : liquidités + actifs par classe ─────────────────────────
  const allocationData = useMemo(() => {
    const classes = {};
    if (liquidWealth > 0) {
      classes['Liquidités'] = { value: liquidWealth };
    }
    (visibleAssets || []).forEach(a => {
      const cls = ASSET_CLASS_MAP[a.type]?.class || 'Divers';
      const val = (parseFloat(a.currentValue) || 0) * (memberShare?.(a) ?? 1);
      if (!classes[cls]) classes[cls] = { value: 0 };
      classes[cls].value += val;
    });
    const entries = Object.entries(classes)
      .filter(([, d]) => d.value > 0)
      .map(([name, d]) => ({ name, value: d.value }))
      .sort((a, b) => b.value - a.value);
    return entries.map((e, i) => ({ ...e, color: DATAVIZ[i % DATAVIZ.length] }));
  }, [liquidWealth, visibleAssets, memberShare]);
  const allocationTotal = allocationData.reduce((s, d) => s + d.value, 0);

  // ── Performance ────────────────────────────────────────────────────────
  const sortedEvo = useMemo(
    () => [...(monthlyEvolution || [])].sort((a, b) => a.month.localeCompare(b.month)),
    [monthlyEvolution]
  );

  const chartData = useMemo(() => {
    const p = PERIODS.find(p => p.id === period);
    return p?.months ? sortedEvo.slice(-p.months - 1) : sortedEvo;
  }, [sortedEvo, period]);

  const periodDelta = useMemo(() => {
    if (chartData.length < 2) return { abs: 0, pct: 0 };
    const first = chartData[0].balance;
    const last = chartData[chartData.length - 1].balance;
    return { abs: last - first, pct: first ? ((last - first) / Math.abs(first)) * 100 : 0 };
  }, [chartData]);

  // KPI strip — 4 cellules : Actifs / Passifs / Liquidités / Épargne mois
  const monthSaving = (thisMonthStats?.income || 0) - (thisMonthStats?.expenses || 0);
  const kpis = [
    { label: t('dashboard.assets'),       value: assetsValue,                       delta: null },
    { label: t('dashboard.liabilities'),  value: -Math.abs(liabilitiesValue || 0),  delta: null },
    { label: t('dashboard.liquidity'),    value: liquidWealth,                       delta: null },
    { label: t('dashboard.savingsMonth'), value: monthSaving, delta: thisMonthStats?.income ? (monthSaving / thisMonthStats.income) * 100 : null },
  ];

  // Transactions filtrées par chip
  const recentTx = useMemo(() => {
    let list = [...(transactions || [])].sort((a, b) => b.date.localeCompare(a.date));
    if (txFilter === 'expense') list = list.filter(t => t.amount < 0 && !transferIds.has(t.id));
    if (txFilter === 'income')  list = list.filter(t => t.amount > 0 && !transferIds.has(t.id));
    return list.slice(0, 9);
  }, [transactions, txFilter, transferIds]);

  // Grouped by day for display
  const txByDay = useMemo(() => {
    const groups = new Map();
    recentTx.forEach(t => {
      const key = t.date.slice(0, 10);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key).push(t);
    });
    return [...groups.entries()].map(([day, txs]) => ({
      day,
      txs,
      total: txs.reduce((s, t) => s + t.amount, 0),
    }));
  }, [recentTx]);

  // Budget panel (top 5 expense categories with budget set)
  const budgetItems = useMemo(() => {
    const items = Object.entries(budgets)
      .map(([catId, amount]) => {
        const spent = categoryAnalysis[catId]?.current || 0;
        const cat = categories.find(c => c.id === catId || c.slug === catId);
        return { catId, label: cat?.name || catId, amount, spent, pct: amount ? (spent / amount) * 100 : 0 };
      })
      .sort((a, b) => b.pct - a.pct)
      .slice(0, 5);
    return items;
  }, [budgets, categoryAnalysis, categories]);
  const totalBudget = budgetItems.reduce((s, i) => s + i.amount, 0);
  const totalSpent  = budgetItems.reduce((s, i) => s + i.spent, 0);

  // Insights
  const insights = useMemo(() => {
    const list = [];
    if (thisMonthStats?.income > 0) {
      const rate = (monthSaving / thisMonthStats.income) * 100;
      if (rate >= 30) {
        list.push({ variant: 'pos', icon: <TrendingUp size={14}/>, title: 'Excellent taux d\'épargne', body: `${formatEUR(monthSaving)} épargnés ce mois, ${rate.toFixed(0)} % des revenus.` });
      } else if (rate < 0) {
        list.push({ variant: 'neg', icon: <AlertTriangle size={14}/>, title: 'Dépenses supérieures aux revenus', body: `${formatEUR(Math.abs(monthSaving))} à combler ce mois.` });
      } else {
        list.push({ variant: 'neutral', icon: <Sparkles size={14}/>, title: 'Marge mensuelle', body: `${formatEUR(monthSaving)} de marge — visez 30 % pour solidifier l'épargne.` });
      }
    }
    const overBudgets = Object.entries(budgets).filter(([id, a]) => (categoryAnalysis[id]?.current || 0) > a);
    if (overBudgets.length) {
      list.push({ variant: 'neg', icon: <AlertTriangle size={14}/>, title: `${overBudgets.length} budget${overBudgets.length > 1 ? 's' : ''} dépassé${overBudgets.length > 1 ? 's' : ''}`, body: 'À examiner dans la section budgets.' });
    }
    if (periodDelta.pct > 5) {
      list.push({ variant: 'pos', icon: <TrendingUp size={14}/>, title: 'Patrimoine en hausse', body: `+${periodDelta.pct.toFixed(1)} % sur la période — la trajectoire est bonne.` });
    }
    return list.slice(0, 3);
  }, [thisMonthStats, monthSaving, budgets, categoryAnalysis, periodDelta]);

  const userFirstName = currentUser?.full_name?.split(' ')[0]
    || currentUser?.email?.split('@')[0]
    || (activeMemberId !== 'all' ? members?.find(m => m.id === activeMemberId)?.name : null)
    || members?.[0]?.name
    || '';

  return (
    <div className="dash-v3">
      <DashStyles/>

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <header className="dash-head">
        <div>
          <h1 className="dash-h1">{greeting(t)}{userFirstName ? ` ${userFirstName}` : ''}</h1>
          <div className="dash-sub">
            {visibleAccounts?.length || 0}&nbsp;compte{(visibleAccounts?.length || 0) > 1 ? 's' : ''} connecté{(visibleAccounts?.length || 0) > 1 ? 's' : ''}
          </div>
        </div>
        <div className="dash-actions">
          <button className="ds-btn"><Download size={14}/> {t('dashboard.export')}</button>
          <button className="ds-btn"><RefreshCw size={14}/> {t('dashboard.sync')}</button>
          <button className="ds-btn primary"><Plus size={14}/> {t('dashboard.newAccount')}</button>
        </div>
      </header>

      {/* ── Hero KPI + Allocation ──────────────────────────────────────── */}
      <section className="dash-hero-row">
        <div className="hero-card">
          <div className="hero-top">
            <span className="ds-caption">{t('dashboard.totalNetWorth')}</span>
            <div className="ds-range-tabs">
              {PERIODS.map(p => (
                <button key={p.id}
                  className={period === p.id ? 'on' : ''}
                  onClick={() => setPeriod(p.id)}>
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="hero-number-row">
            <Amount value={hover?.balance ?? netWorth} hero/>
            <div className="hero-delta">
              <span className={`ds-pill ${periodDelta.abs >= 0 ? 'pos' : 'neg'}`}>
                {periodDelta.abs >= 0 ? <ArrowUp size={11}/> : <ArrowDown size={11}/>}
                <span className="num">{periodDelta.abs >= 0 ? '+' : ''}{formatEUR(periodDelta.abs)} · {periodDelta.pct >= 0 ? '+' : ''}{periodDelta.pct.toFixed(2)}&nbsp;%</span>
              </span>
              <span style={{ color: 'var(--ink-2)', fontSize: 13 }}>{t('dashboard.vsStart')}</span>
            </div>
          </div>

          <HeroChart data={chartData} onHover={setHover} hover={hover}/>

          <div className="kpi-strip">
            {kpis.map((k, i) => (
              <div key={i} className="kpi-cell">
                <div className="ds-micro">{k.label}</div>
                <div className="kpi-val num">{formatEUR(k.value)}</div>
                {k.delta != null && (
                  <div className={`kpi-delta num ${k.delta >= 0 ? 'pos' : 'neg'}`}>
                    {k.delta >= 0 ? '+' : ''}{k.delta.toFixed(1)} %
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        <div className="alloc-card">
          <div className="alloc-head">
            <span className="ds-panel-title">{t('dashboard.allocation')}</span>
            <button className="link-btn" onClick={() => setView?.('wealth')}>{t('dashboard.details')}</button>
          </div>
          <div className="alloc-body">
            <Donut
              data={allocationData}
              size={140}
              centerLabel="Total"
              centerValue={formatEUR(allocationTotal, { abbr: true })}
            />
            <ul className="alloc-list">
              {allocationData.map(d => (
                <li key={d.name}>
                  <span className="swatch" style={{ background: d.color }}/>
                  <span className="alloc-name">{d.name}</span>
                  <span className="alloc-val num">{formatEUR(d.value, { abbr: true })}</span>
                  <span className="alloc-pct num">{allocationTotal ? ((d.value / allocationTotal) * 100).toFixed(0) : '0'} %</span>
                </li>
              ))}
              {!allocationData.length && (
                <li style={{ color: 'var(--ink-3)', padding: '6px 0' }}>Aucune donnée pour l'instant.</li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {/* ── Mes comptes ────────────────────────────────────────────────── */}
      <section className="accounts-panel ds-panel">
        <div className="ds-panel-head">
          <div>
            <div className="ds-panel-title">{t('dashboard.accounts')} · {visibleAccounts?.length || 0}</div>
          </div>
          <button className="link-btn" onClick={() => setView?.('settings')}>{t('dashboard.viewAll')} →</button>
        </div>

        <div className="accounts-cols ds-micro">
          <div>{t('dashboard.colAccount')}</div>
          <div style={{ textAlign: 'right' }}>{t('dashboard.colBalance')}</div>
          <div style={{ textAlign: 'right' }}>{t('dashboard.col30d')}</div>
          <div style={{ textAlign: 'right' }}>{t('dashboard.colType')}</div>
          <div style={{ textAlign: 'right' }}>{t('dashboard.colSync')}</div>
          <div/>
        </div>

        <div className="accounts-rows">
          {(visibleAccounts || []).map(a => {
            const bal = accountBalances?.[a.id] ?? 0;
            const spark = buildSparkData(transactions, a.id, bal);
            return (
              <button key={a.id} className="account-row" onClick={() => onAccountClick?.(a)}>
                <div className="account-id">
                  <BankMark bank={a.bank} name={a.name}/>
                  <div className="account-name">
                    <div className="line1">{a.bank ? `${a.bank} · ` : ''}{a.name}</div>
                    <div className="line2 mono">{a.currency || 'EUR'}</div>
                  </div>
                </div>
                <div className="num cell-r">{formatEUR(bal)}</div>
                <div className="cell-r"><Sparkline data={spark}/></div>
                <div className="cell-r" style={{ color: 'var(--ink-3)', fontSize: 12 }}>{prettyType(a.type)}</div>
                <div className="cell-r" style={{ color: 'var(--positive)', fontSize: 11.5 }}>il y a 4&nbsp;min</div>
                <div className="cell-r"><span className="ds-icon-btn" style={{ width: 26, height: 26 }} onClick={(e) => e.stopPropagation()}><MoreHorizontal size={14}/></span></div>
              </button>
            );
          })}
          {!visibleAccounts?.length && (
            <div style={{ padding: '20px', color: 'var(--ink-3)', fontSize: 13 }}>
              {t('dashboard.noAccounts')} <button className="link-btn" onClick={() => setView?.('settings')}>{t('dashboard.connectBank')}</button>
            </div>
          )}
        </div>
      </section>

      {/* ── Transactions + Budget + Insights ───────────────────────────── */}
      <section className="dash-bottom-row">
        {/* Transactions panel */}
        <div className="ds-panel">
          <div className="ds-panel-head">
            <div>
              <div className="ds-panel-title">{t('dashboard.recent')}</div>
              <div className="ds-panel-sub">{t('dashboard.recentMeta')}</div>
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[['all', t('dashboard.filterAll')], ['expense', t('dashboard.filterExpenses')], ['income', t('dashboard.filterIncome')]].map(([id, label]) => (
                <button key={id}
                  className={`ds-chip ${txFilter === id ? 'on' : ''}`}
                  onClick={() => setTxFilter(id)}>
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="tx-list">
            {txByDay.map(grp => (
              <div key={grp.day}>
                <div className="tx-day">
                  <span className="ds-micro">{prettyDay(grp.day)}</span>
                  <span className="num" style={{ color: grp.total >= 0 ? 'var(--positive)' : 'var(--ink-2)', fontSize: 12 }}>
                    {grp.total >= 0 ? '+' : ''}{formatEUR(grp.total)}
                  </span>
                </div>
                {grp.txs.map(t => {
                  const cat = categories.find(c => c.id === t.categoryId || c.slug === t.categoryId);
                  const isTransfer = transferIds.has(t.id);
                  return (
                    <div key={t.id} className="tx-row">
                      <div className="ds-tx-icon" style={{
                        background: t.amount >= 0 ? 'var(--positive-soft)' : 'var(--neutral-soft)',
                        color: t.amount >= 0 ? 'var(--positive)' : 'var(--ink-2)',
                      }}>{INITIAL(t.label)}</div>
                      <div className="tx-mid">
                        <div className="tx-label">{t.label || '(sans libellé)'}</div>
                        <div className="tx-meta">
                          {isTransfer
                            ? <span className="ds-pill accent">Transfert</span>
                            : <span className="ds-pill">{cat?.name || 'Non catégorisé'}</span>}
                          <span>{accountName(visibleAccounts, t.accountId)}</span>
                        </div>
                      </div>
                      <div className="tx-amount num" style={{ color: t.amount > 0 ? 'var(--positive)' : 'var(--ink)' }}>
                        {t.amount >= 0 ? '+' : ''}{formatEUR(t.amount)}
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
            {!recentTx.length && (
              <div style={{ padding: 20, color: 'var(--ink-3)', fontSize: 13 }}>
                {t('dashboard.noTransactions')}
              </div>
            )}
          </div>
        </div>

        <div className="dash-side-stack">
          {/* Budget panel */}
          <div className="ds-panel">
            <div className="ds-panel-head">
              <div>
                <div className="ds-panel-title">Budget · {monthName(currentMonth)}</div>
                <div className="ds-panel-sub num">{formatEUR(totalSpent)} / {formatEUR(totalBudget)}</div>
              </div>
              <button className="link-btn" onClick={() => setView?.('budgets')}>Tout →</button>
            </div>
            <div className="budget-list">
              {budgetItems.map(b => (
                <div key={b.catId} className="budget-item">
                  <div className="budget-line1">
                    <span>{b.label}</span>
                    <span className="num" style={{ fontWeight: 500 }}>
                      {formatEUR(b.spent)} <span style={{ color: 'var(--ink-3)' }}>/ {formatEUR(b.amount)}</span>
                    </span>
                  </div>
                  <div className="budget-bar">
                    <div
                      className="budget-fill"
                      style={{
                        width: `${Math.min(100, b.pct)}%`,
                        background: b.pct >= 100 ? 'var(--negative)' : b.pct >= 80 ? 'var(--warning)' : 'var(--accent)',
                      }}
                    />
                  </div>
                  <div className="budget-line3">
                    <span style={{ color: 'var(--ink-3)' }}>{b.pct >= 100 ? 'Dépassé' : `Reste ${formatEUR(Math.max(0, b.amount - b.spent))}`}</span>
                    <span className="mono num">{b.pct.toFixed(0)} %</span>
                  </div>
                </div>
              ))}
              {!budgetItems.length && (
                <div style={{ padding: 14, color: 'var(--ink-3)', fontSize: 13 }}>
                  Aucun budget défini. <button className="link-btn" onClick={() => setView?.('budgets')}>En créer →</button>
                </div>
              )}
            </div>
          </div>

          {/* Insights panel */}
          <div className="ds-panel">
            <div className="ds-panel-head">
              <div>
                <div className="ds-panel-title">Insights</div>
                <div className="ds-panel-sub">{t('dashboard.insightsGenerated')}</div>
              </div>
            </div>
            <div className="insights-list">
              {insights.map((it, i) => (
                <div key={i} className={`insight ${it.variant}`}>
                  <div className="insight-icon">{it.icon}</div>
                  <div>
                    <div className="insight-title">{it.title}</div>
                    <div className="insight-body">{it.body}</div>
                  </div>
                </div>
              ))}
              {!insights.length && (
                <div style={{ padding: 14, color: 'var(--ink-3)', fontSize: 13 }}>
                  Plus d'insights apparaîtront avec quelques mois de données.
                </div>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Hero chart — SVG manuel, viewBox 700×200, aire avec gradient accent.
// ────────────────────────────────────────────────────────────────────────
function HeroChart({ data, onHover, hover }) {
  if (!data || data.length < 2) {
    return (
      <div style={{
        height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'var(--ink-3)', fontSize: 13,
        borderTop: '1px dashed var(--border)', marginTop: 16,
      }}>
        Pas encore assez d'historique pour tracer la courbe.
      </div>
    );
  }
  const W = 700, H = 200, PT = 16, PB = 28, PL = 0, PR = 8;
  const innerW = W - PL - PR;
  const innerH = H - PT - PB;
  const vals = data.map(d => d.balance);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const range = max - min || 1;
  const stepX = innerW / (data.length - 1);
  const xy = data.map((d, i) => ({
    x: PL + i * stepX,
    y: PT + innerH - ((d.balance - min) / range) * innerH,
    d,
  }));
  const line = xy.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');
  const area = `${line} L ${xy[xy.length-1].x.toFixed(1)} ${PT + innerH} L ${xy[0].x.toFixed(1)} ${PT + innerH} Z`;

  // Gridlines (4 horizontal, pointillées)
  const grid = [0.25, 0.5, 0.75, 1].map(f => PT + innerH * f);

  // Axis labels
  const sampleEvery = Math.max(1, Math.ceil(data.length / 7));
  const labels = data.map((d, i) => ({ i, d, show: i % sampleEvery === 0 || i === data.length - 1 }));

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * W;
    let nearest = xy[0], best = Infinity;
    for (const p of xy) {
      const dx = Math.abs(p.x - x);
      if (dx < best) { best = dx; nearest = p; }
    }
    onHover?.(nearest.d);
  };

  return (
    <div className="hero-chart" onMouseLeave={() => onHover?.(null)} onMouseMove={handleMove}>
      <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="200" preserveAspectRatio="none" aria-hidden>
        <defs>
          <linearGradient id="heroFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%"   stopColor="var(--accent)" stopOpacity="0.18"/>
            <stop offset="100%" stopColor="var(--accent)" stopOpacity="0"/>
          </linearGradient>
        </defs>
        {grid.map((y, i) => (
          <line key={i} x1={PL} x2={W - PR} y1={y} y2={y}
                stroke="var(--border)" strokeDasharray="2 4" strokeWidth="1"/>
        ))}
        <path d={area} fill="url(#heroFill)"/>
        <path d={line} fill="none" stroke="var(--accent)" strokeWidth="2"
              strokeLinecap="round" strokeLinejoin="round"/>
        {/* Last point */}
        <circle cx={xy[xy.length-1].x} cy={xy[xy.length-1].y}
                r="4" fill="var(--bg-elev)" stroke="var(--accent)" strokeWidth="2"/>
        {/* Hover */}
        {hover && (() => {
          const p = xy.find(p => p.d === hover);
          if (!p) return null;
          return (
            <g>
              <line x1={p.x} x2={p.x} y1={PT} y2={PT + innerH}
                    stroke="var(--ink-mute)" strokeDasharray="3 3" strokeWidth="1"/>
              <circle cx={p.x} cy={p.y} r="4" fill="var(--bg-elev)" stroke="var(--accent)" strokeWidth="2"/>
            </g>
          );
        })()}
      </svg>
      <div className="hero-axis">
        {labels.filter(l => l.show).map(l => (
          <span key={l.i} className="mono">{shortMonth(l.d.month)}</span>
        ))}
      </div>
    </div>
  );
}

// ────────────────────────────────────────────────────────────────────────
// Helpers
// ────────────────────────────────────────────────────────────────────────
function prettyDay(iso) {
  const d = new Date(iso);
  const today = new Date();
  const ytd = new Date(today); ytd.setDate(today.getDate() - 1);
  const eq = (a, b) => a.toDateString() === b.toDateString();
  if (eq(d, today)) return "Aujourd'hui";
  if (eq(d, ytd))   return 'Hier';
  return d.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
}

function shortMonth(m) {
  if (!m) return '';
  const d = new Date(m + '-01');
  return d.toLocaleDateString('fr-FR', { month: 'short' }).replace('.', '');
}

function monthName(m) {
  if (!m) {
    return new Date().toLocaleDateString('fr-FR', { month: 'long' });
  }
  const d = new Date(m + '-01');
  return d.toLocaleDateString('fr-FR', { month: 'long' });
}

function accountName(accounts, id) {
  const a = accounts?.find(x => x.id === id);
  return a ? (a.bank ? `${a.bank} · ${a.name}` : a.name) : '';
}

function prettyType(t) {
  const map = {
    checking:    'Courant',
    savings:     'Épargne',
    pea:         'PEA',
    cto:         'CTO',
    assurance_vie: 'Assurance vie',
    crypto:      'Crypto',
    other:       'Autre',
  };
  return map[t] || t || '—';
}

function buildSparkData(transactions, accountId, currentBalance) {
  const txs = (transactions || []).filter(t => t.accountId === accountId).slice(-12);
  if (!txs.length) return [currentBalance, currentBalance];
  let bal = currentBalance;
  const series = [bal];
  for (let i = txs.length - 1; i >= 0; i--) {
    bal -= txs[i].amount;
    series.unshift(bal);
  }
  return series;
}

// ────────────────────────────────────────────────────────────────────────
// Styles spécifiques Dashboard (CSS-in-JS scopé).
// ────────────────────────────────────────────────────────────────────────
function DashStyles() {
  const css = `
.dash-v3 {
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 16px;
  max-width: 1320px;
  margin: 0 auto;
}
.dash-v3 .mono { font-family: var(--font-mono); }
.dash-v3 .link-btn {
  background: transparent; border: none; padding: 0;
  color: var(--ink-3); font-size: 12px; cursor: pointer;
  font-family: var(--font-sans);
  transition: color var(--t-fast);
}
.dash-v3 .link-btn:hover { color: var(--ink); }
.dash-v3 .cell-r { text-align: right; }

/* Header */
.dash-head { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 4px; flex-wrap: wrap; }
.dash-h1 { font: 500 24px/1.15 var(--font-sans); letter-spacing: -0.02em; margin: 0 0 6px; color: var(--ink); }
.dash-sub { display: inline-flex; align-items: center; gap: 8px; font-size: 13px; color: var(--ink-3); }
.dash-actions { display: flex; gap: 8px; flex-wrap: wrap; }

/* Hero row */
.dash-hero-row { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; }
@media (max-width: 1024px) { .dash-hero-row { grid-template-columns: 1fr; } }

.hero-card {
  background: var(--bg-elev);
  border: 1px solid var(--border);
  border-radius: var(--radius-xl);
  padding: 28px 28px 0;
}
.hero-top { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.hero-number-row { display: flex; align-items: baseline; gap: 16px; margin-top: 18px; flex-wrap: wrap; }
.hero-delta { display: flex; align-items: center; gap: 8px; }
.hero-chart { margin: 8px -4px 0; position: relative; cursor: crosshair; }
.hero-axis { display: flex; justify-content: space-between; padding: 4px 8px 12px; color: var(--ink-3); font-size: 11px; }

.kpi-strip {
  display: grid; grid-template-columns: repeat(4, 1fr);
  margin: 0 -28px;
  border-top: 1px solid var(--border);
}
.kpi-cell { padding: 16px 20px; border-right: 1px solid var(--border); display: flex; flex-direction: column; gap: 4px; }
.kpi-cell:last-child { border-right: none; }
.kpi-val { font-size: 16px; font-weight: 500; color: var(--ink); }
.kpi-delta { font-size: 11px; }
.kpi-delta.pos { color: var(--positive); }
.kpi-delta.neg { color: var(--negative); }

/* Allocation card */
.alloc-card { background: var(--bg-elev); border: 1px solid var(--border); border-radius: var(--radius-xl); padding: 24px; display: flex; flex-direction: column; gap: 18px; }
.alloc-head { display: flex; justify-content: space-between; align-items: baseline; }
.alloc-body { display: flex; gap: 18px; align-items: center; }
.alloc-list { list-style: none; margin: 0; padding: 0; flex: 1; display: flex; flex-direction: column; gap: 8px; }
.alloc-list li { display: grid; grid-template-columns: 10px 1fr auto auto; gap: 8px; align-items: center; }
.alloc-list .swatch { width: 8px; height: 8px; border-radius: 2px; }
.alloc-list .alloc-name { font-size: 13px; color: var(--ink); }
.alloc-list .alloc-val { font-size: 13px; color: var(--ink-2); font-weight: 500; }
.alloc-list .alloc-pct { font-size: 11px; color: var(--ink-3); min-width: 38px; text-align: right; }

/* Accounts panel */
.accounts-panel { margin-top: 0; }
.accounts-cols {
  display: grid;
  grid-template-columns: 1.7fr 1fr 1fr 0.8fr 0.9fr 30px;
  padding: 10px 20px;
  background: var(--bg-sunk);
  gap: 12px;
}
.accounts-rows { display: flex; flex-direction: column; }
.account-row {
  display: grid;
  grid-template-columns: 1.7fr 1fr 1fr 0.8fr 0.9fr 30px;
  align-items: center;
  gap: 12px;
  padding: 12px 20px;
  border-top: 1px solid var(--border);
  background: transparent;
  border-left: none; border-right: none; border-bottom: none;
  text-align: left;
  cursor: pointer;
  transition: background var(--t-fast);
  font-family: inherit;
}
.account-row:hover { background: var(--bg-hover); }
.account-id { display: flex; align-items: center; gap: 12px; min-width: 0; }
.account-name { min-width: 0; }
.account-name .line1 { font-size: 13px; font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.account-name .line2 { font-size: 11px; color: var(--ink-3); }

/* Bottom row */
.dash-bottom-row { display: grid; grid-template-columns: 2fr 1fr; gap: 16px; }
@media (max-width: 1024px) { .dash-bottom-row { grid-template-columns: 1fr; } }
.dash-side-stack { display: flex; flex-direction: column; gap: 16px; }

/* Transactions list */
.tx-list { padding: 0; }
.tx-day { display: flex; justify-content: space-between; align-items: center; padding: 10px 20px; background: var(--bg); color: var(--ink-3); }
.tx-row { display: grid; grid-template-columns: 32px 1fr auto; gap: 12px; align-items: center; padding: 10px 20px; border-top: 1px solid var(--border); transition: background var(--t-fast); }
.tx-row:hover { background: var(--bg-hover); }
.tx-mid { min-width: 0; }
.tx-label { font-size: 13.5px; font-weight: 500; color: var(--ink); overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.tx-meta { display: flex; align-items: center; gap: 8px; margin-top: 2px; font-size: 11px; color: var(--ink-3); }
.tx-amount { font-size: 14px; font-weight: 500; }

/* Budget panel */
.budget-list { padding: 4px 8px 12px; }
.budget-item { padding: 12px 12px; border-radius: var(--radius-md); display: flex; flex-direction: column; gap: 6px; transition: background var(--t-fast); }
.budget-item:hover { background: var(--bg-hover); }
.budget-line1 { display: flex; justify-content: space-between; font-size: 13px; color: var(--ink); }
.budget-bar { height: 6px; border-radius: 3px; background: var(--bg-sunk); overflow: hidden; }
.budget-fill { height: 100%; border-radius: 3px; transition: width var(--t-med); }
.budget-line3 { display: flex; justify-content: space-between; font-size: 11px; }

/* Insights */
.insights-list { padding: 12px; display: flex; flex-direction: column; gap: 8px; }
.insight { display: flex; gap: 12px; align-items: flex-start; padding: 12px 14px; border-radius: var(--radius-md); border: 1px solid var(--border); transition: border-color var(--t-fast); }
.insight:hover { border-color: var(--border-strong); }
.insight-icon { width: 28px; height: 28px; border-radius: var(--radius-md); background: var(--neutral-soft); color: var(--ink-2); display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.insight.pos .insight-icon { background: var(--positive-soft); color: var(--positive); }
.insight.neg .insight-icon { background: var(--negative-soft); color: var(--negative); }
.insight-title { font-size: 13px; font-weight: 500; color: var(--ink); }
.insight-body { font-size: 12px; color: var(--ink-2); line-height: 1.45; margin-top: 2px; }

/* Mobile */
@media (max-width: 768px) {
  .dash-v3 { padding: 16px; gap: 12px; }
  .kpi-strip { grid-template-columns: repeat(2, 1fr); }
  .kpi-cell:nth-child(2) { border-right: none; }
  .accounts-cols, .account-row { grid-template-columns: 1.4fr 1fr 30px; }
  .accounts-cols > div:nth-child(3),
  .accounts-cols > div:nth-child(4),
  .accounts-cols > div:nth-child(5),
  .account-row > :nth-child(3),
  .account-row > :nth-child(4),
  .account-row > :nth-child(5) { display: none; }
}
`;
  return <style dangerouslySetInnerHTML={{ __html: css }}/>;
}
