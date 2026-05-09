// ============================================================================
// Dashboard — Trove (modern fintech direction)
//
// Landing view: net worth hero + account cards + allocation + recent activity
// + insights + goals. Same props surface as before so WealthlyApp doesn't
// need to change.
// ============================================================================
import { useMemo, useState } from 'react';
import { AreaChart, Area, ResponsiveContainer, Tooltip } from 'recharts';
import {
  Upload, Plus, ChevronRight, AlertTriangle, Zap, ArrowUp, ArrowDown,
  FileText, Landmark, ArrowRightLeft, TrendingUp, Wallet, PiggyBank, Target,
  Sparkles, ArrowUpRight,
} from 'lucide-react';
import { ASSET_CLASS_MAP } from '../constants.js';
import { formatCurrency, formatDate } from '../utils.js';
import { AnimatedNumber } from '../components/AnimatedNumber.jsx';
import { computeHealthScore } from '../components/HealthScore.jsx';

const PERIODS = [
  { id: '1m', label: '1M', months: 1 },
  { id: '3m', label: '3M', months: 3 },
  { id: '6m', label: '6M', months: 6 },
  { id: '1y', label: '1A', months: 12 },
  { id: 'all', label: 'Tout', months: null },
];

export function Dashboard({
  netWorth, liquidWealth, assetsValue, liabilitiesValue,
  thisMonthStats, monthlyEvolution,
  visibleAccounts, accountBalances,
  visibleAssets, visibleLiabilities,
  members, activeMemberId,
  transactions, categories, fmt, memberShare,
  categoryAnalysis, anomalies, cashflowProjection,
  goals, budgets = {}, wealthHistory = [],
  recurringGroups, currentMonth,
  transferIds = new Set(), transferPairs = [],
  setView, onAccountClick,
  baseCurrency = 'EUR', rates = null,
}) {
  const [period, setPeriod] = useState('6m');
  const activeMember = members.find(m => m.id === activeMemberId);
  const recentTx = [...transactions]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  // ── Allocation: liquidités + actifs par classe ─────────────────────────
  const allocationData = useMemo(() => {
    const classes = {};
    if (liquidWealth > 0) {
      classes['Liquidités'] = { value: liquidWealth, color: 'var(--color-w-asset-cash)' };
    }
    visibleAssets.forEach(a => {
      const cls = ASSET_CLASS_MAP[a.type]?.class || 'Divers';
      const color = ASSET_CLASS_MAP[a.type]?.color || 'var(--color-w-asset-other)';
      const val = (parseFloat(a.currentValue) || 0) * memberShare(a);
      if (!classes[cls]) classes[cls] = { value: 0, color };
      classes[cls].value += val;
    });
    return Object.entries(classes)
      .filter(([, d]) => d.value > 0)
      .map(([name, d]) => ({ name, ...d }))
      .sort((a, b) => b.value - a.value);
  }, [liquidWealth, visibleAssets, memberShare]);
  const allocationTotal = allocationData.reduce((s, d) => s + d.value, 0);

  // ── Performance ────────────────────────────────────────────────────────
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

  const ytdPerf = useMemo(() => {
    const yearPrefix = `${new Date().getFullYear()}-`;
    const sorted = [...monthlyEvolution].sort((a, b) => a.month.localeCompare(b.month));
    const yearStart = sorted.find(m => m.month.startsWith(yearPrefix));
    if (!yearStart || !yearStart.balance) return { pct: null, amount: null };
    const amount = netWorth - yearStart.balance;
    const pct = (amount / Math.abs(yearStart.balance)) * 100;
    return { pct, amount };
  }, [monthlyEvolution, netWorth]);

  const monthDelta = perf.m1 !== null && monthlyEvolution.length >= 2
    ? netWorth - monthlyEvolution[monthlyEvolution.length - 2].balance
    : null;

  const chartData = useMemo(() => {
    const sorted = [...monthlyEvolution].sort((a, b) => a.month.localeCompare(b.month));
    const p = PERIODS.find(p => p.id === period);
    return p?.months ? sorted.slice(-p.months) : sorted;
  }, [monthlyEvolution, period]);

  // ── Health score ───────────────────────────────────────────────────────
  const health = useMemo(
    () => computeHealthScore({ monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, budgets, categoryAnalysis }),
    [monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, budgets, categoryAnalysis]
  );
  const healthColor = health.total < 40
    ? 'var(--color-w-danger)'
    : health.total < 70
    ? 'var(--color-w-warning)'
    : 'var(--color-w-success)';

  // ── Streak ─────────────────────────────────────────────────────────────
  const streak = useMemo(() => {
    let count = 0;
    for (let i = monthlyEvolution.length - 1; i >= 0; i--) {
      if (monthlyEvolution[i].net > 0) count++;
      else break;
    }
    return count;
  }, [monthlyEvolution]);

  // ── Insights (sourced from anomalies + budget overruns + streak) ───────
  const insights = useMemo(() => {
    const out = [];
    if (streak >= 3) {
      out.push({
        kind: 'success',
        title: `${streak} mois consécutifs en positif`,
        body: 'Votre solde mensuel est positif depuis plusieurs mois. Continuez sur cette dynamique.',
      });
    }
    if (thisMonthStats.income > 0) {
      const savingRate = ((thisMonthStats.income - thisMonthStats.expenses) / thisMonthStats.income) * 100;
      if (savingRate >= 30) {
        out.push({
          kind: 'success',
          title: `Taux d'épargne de ${savingRate.toFixed(0)} %`,
          body: `Vous avez épargné ${fmt(thisMonthStats.income - thisMonthStats.expenses)} ce mois. Au-dessus de la barre des 30 %.`,
        });
      } else if (savingRate < 0) {
        out.push({
          kind: 'warn',
          title: 'Solde mensuel négatif',
          body: `Vos dépenses dépassent vos revenus de ${fmt(Math.abs(thisMonthStats.income - thisMonthStats.expenses))} ce mois.`,
        });
      }
    }
    (anomalies || []).slice(0, 2).forEach(a => {
      out.push({ kind: 'warn', title: a.title || 'Dépense inhabituelle', body: a.body || a.description });
    });
    return out.slice(0, 3);
  }, [streak, thisMonthStats, anomalies, fmt]);

  const periodPairs = useMemo(() => {
    const ym = currentMonth ? currentMonth : new Date().toISOString().slice(0, 7);
    return (transferPairs || []).filter(p => (p.date || '').startsWith(ym));
  }, [transferPairs, currentMonth]);
  const periodPairsTotal = periodPairs.reduce((s, p) => s + Math.abs(p.amount || 0), 0);

  // ── Empty state ────────────────────────────────────────────────────────
  if (visibleAccounts.length === 0 && visibleAssets.length === 0 && visibleLiabilities.length === 0) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center px-6">
        <div className="max-w-xl w-full text-center">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-6"
               style={{ background: 'var(--gradient-hero)', boxShadow: '0 8px 32px rgba(59,111,224,0.4)' }}>
            <Sparkles size={28} className="text-white"/>
          </div>
          <h1 className="text-[clamp(32px,4.5vw,46px)] leading-[1.1] font-bold tracking-[-0.025em] text-[var(--color-w-text)] mb-4">
            {activeMember ? `Bienvenue, ${activeMember.name}` : 'Bienvenue sur Trove'}
          </h1>
          <p className="text-[var(--color-w-muted)] leading-relaxed mb-8 max-w-md mx-auto">
            Importez un relevé, saisissez un actif ou connectez votre banque — Trove rassemble tout en un seul tableau de bord.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
            <button
              onClick={() => setView('import')}
              className="primary-btn-large flex-1 justify-center"
            >
              <Upload size={15}/> Importer un relevé
            </button>
            <button
              onClick={() => setView('wealth')}
              className="secondary-btn flex-1 justify-center"
              style={{ height: 44, fontSize: 14 }}
            >
              <Plus size={14}/> Saisir un actif
            </button>
          </div>
          <button
            onClick={() => setView('settings')}
            className="mt-3 inline-flex items-center gap-2 px-4 h-10 text-sm text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] transition-colors"
          >
            <Landmark size={14}/> Connecter ma banque
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

  const dateLong = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long', day: 'numeric', month: 'long',
  });

  // Account card colour palette — keyed by account.color or fallback gradient
  const ACC_GRADIENTS = {
    orange: 'linear-gradient(135deg, #ec5a13 0%, #c14710 50%, #2a1208 100%)',
    blue:   'linear-gradient(135deg, #1e3a8a 0%, #1d4ed8 50%, #0f172a 100%)',
    green:  'linear-gradient(135deg, #065f46 0%, #047857 50%, #022c22 100%)',
    purple: 'linear-gradient(135deg, #5b21b6 0%, #6d28d9 50%, #1e1b4b 100%)',
    red:    'linear-gradient(135deg, #991b1b 0%, #7f1d1d 50%, #1f0a0a 100%)',
    grey:   'linear-gradient(135deg, #334155 0%, #1e293b 50%, #020617 100%)',
    black:  'linear-gradient(135deg, #1f2937 0%, #111827 50%, #000 100%)',
    pink:   'linear-gradient(135deg, #be185d 0%, #9d174d 50%, #1f0a14 100%)',
    teal:   'linear-gradient(135deg, #0f766e 0%, #134e4a 50%, #042f2e 100%)',
  };
  const accountGradient = (acc) => ACC_GRADIENTS[acc.color] || ACC_GRADIENTS.grey;

  return (
    <div className="trove-dash font-sans">
      {/* TOPBAR */}
      <div className="flex items-end justify-between flex-wrap gap-4 mb-6">
        <div>
          <h1 className="text-[26px] sm:text-[28px] font-bold tracking-[-0.025em] text-[var(--color-w-text)]">
            {greeting}{activeMember ? `, ${activeMember.name}` : ''}
          </h1>
          <div className="flex items-center gap-2 mt-1 text-[13px] text-[var(--color-w-muted)]">
            <span className="w-live-dot"/>
            <span>Synchronisé · {dateLong}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {rates && baseCurrency !== 'EUR' && (
            <button
              onClick={() => setView('settings')}
              title={`1 EUR = ${rates[baseCurrency]?.toFixed(4)} ${baseCurrency} · taux Frankfurter`}
              className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full text-[12px] font-semibold transition-colors"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--border)',
                color: 'var(--text-secondary)',
              }}
            >
              <span className="w-live-dot" style={{ width: 6, height: 6 }}/>
              <span>{baseCurrency}</span>
              <span style={{ color: 'var(--text-muted)' }}>· {rates[baseCurrency]?.toFixed(2)} / €</span>
            </button>
          )}
          {streak >= 2 && (
            <span className="inline-flex items-center gap-1.5 px-3 h-9 rounded-full bg-[var(--color-w-success-soft)] text-[var(--color-w-success)] text-[12.5px] font-semibold">
              <Zap size={12}/> {streak} mois positifs
            </span>
          )}
          <button
            onClick={async () => {
              const { generateBilanPdf } = await import('../pdfReport.js');
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
            className="secondary-btn"
            style={{ height: 36 }}
          >
            <FileText size={14}/> Bilan PDF
          </button>
          <button onClick={() => setView('import')} className="secondary-btn" style={{ height: 36 }}>
            <Upload size={14}/> Importer
          </button>
          <button onClick={() => setView('wealth')} className="primary-btn">
            <Plus size={14}/> Ajouter
          </button>
        </div>
      </div>

      {/* HERO */}
      <section
        className="relative overflow-hidden mb-4 p-6 sm:p-9"
        style={{
          background:
            'linear-gradient(135deg, rgba(91,141,239,0.12) 0%, rgba(167,139,250,0.07) 50%, rgba(52,211,153,0.05) 100%), var(--bg-card)',
          border: '1px solid var(--border)',
          borderRadius: 'var(--radius-w-xl)',
          boxShadow: '0 1px 0 rgba(255,255,255,0.04) inset, 0 20px 60px -20px rgba(0,0,0,0.5)',
        }}
      >
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            top: -120, right: -100, width: 460, height: 460,
            background: 'radial-gradient(circle, rgba(59,111,224,0.30) 0%, transparent 65%)',
          }}
        />
        <div
          aria-hidden="true"
          className="absolute pointer-events-none"
          style={{
            bottom: -150, left: '30%', width: 380, height: 380,
            background: 'radial-gradient(circle, rgba(167,139,250,0.18) 0%, transparent 65%)',
          }}
        />

        <div className="relative">
          <div className="flex items-start justify-between flex-wrap gap-4">
            <div>
              <span className="w-eyebrow">Patrimoine net total</span>
              <div
                className="text-[clamp(46px,7.5vw,84px)] font-bold leading-[1.0] tracking-[-0.038em] mt-3 mb-3 w-num"
                style={{
                  background: 'linear-gradient(180deg, #ffffff 0%, #c8d4ff 100%)',
                  WebkitBackgroundClip: 'text',
                  backgroundClip: 'text',
                  WebkitTextFillColor: 'transparent',
                }}
              >
                <AnimatedNumber value={netWorth} format={(v) => fmt(v)}/>
              </div>
              {monthDelta !== null && (
                <div className="flex items-center gap-3 flex-wrap">
                  <span className={`w-gain-pill ${monthDelta < 0 ? 'danger' : ''}`}>
                    {monthDelta >= 0 ? <ArrowUp size={13}/> : <ArrowDown size={13}/>}
                    <span className="w-num">
                      {monthDelta >= 0 ? '+' : ''}{fmt(monthDelta)}
                      {perf.m1 !== null && ` · ${perf.m1 >= 0 ? '+' : ''}${perf.m1.toFixed(1)} %`}
                    </span>
                  </span>
                  <span className="text-[13px] text-[var(--color-w-muted)]">ce mois</span>
                </div>
              )}
            </div>
            <div
              className="inline-flex gap-0.5 p-1 rounded-[10px]"
              style={{
                background: 'rgba(0,0,0,0.25)',
                border: '1px solid var(--border)',
                backdropFilter: 'blur(8px)',
              }}
            >
              {PERIODS.map(p => (
                <button
                  key={p.id}
                  onClick={() => setPeriod(p.id)}
                  className="px-3 h-7 rounded-[7px] text-[12px] font-medium transition-colors"
                  style={{
                    background: period === p.id ? 'var(--bg-card-hover)' : 'transparent',
                    color: period === p.id ? 'var(--color-w-text)' : 'var(--color-w-muted)',
                    boxShadow: period === p.id ? 'inset 0 1px 0 rgba(255,255,255,0.06)' : 'none',
                  }}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          {/* Chart */}
          {chartData.length >= 2 && (
            <div className="h-[160px] sm:h-[180px] mt-6">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="trove-hero-area" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#5285ee" stopOpacity="0.45"/>
                      <stop offset="100%" stopColor="#5285ee" stopOpacity="0"/>
                    </linearGradient>
                    <linearGradient id="trove-hero-line" x1="0" y1="0" x2="1" y2="0">
                      <stop offset="0%" stopColor="#3b6fe0"/>
                      <stop offset="100%" stopColor="#7aa3ff"/>
                    </linearGradient>
                  </defs>
                  <Area
                    type="monotone"
                    dataKey="balance"
                    stroke="url(#trove-hero-line)"
                    strokeWidth={2.5}
                    fill="url(#trove-hero-area)"
                  />
                  <Tooltip
                    contentStyle={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-strong)',
                      borderRadius: 10,
                      fontSize: 12,
                      color: 'var(--color-w-text)',
                      boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                    }}
                    formatter={(v) => [fmt(v), 'Patrimoine']}
                    labelFormatter={(l) => formatDate(l + '-01', { format: 'monthYear' })}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Inline deltas */}
          <div className="flex flex-wrap gap-x-7 gap-y-3 mt-5 pt-5 border-t border-[var(--color-w-border)]">
            {[
              { label: '30 jours', pct: perf.m1, amount: monthDelta },
              { label: '3 mois', pct: perf.m3, amount: perf.m3 !== null && monthlyEvolution.length >= 4 ? netWorth - monthlyEvolution[monthlyEvolution.length - 4].balance : null },
              { label: 'Année en cours', pct: ytdPerf.pct, amount: ytdPerf.amount },
              { label: 'Score patrimoine', pct: null, amount: null, score: health.total },
            ].map(d => (
              <div key={d.label} className="flex flex-col gap-1 min-w-[110px]">
                <span className="text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--color-w-muted)]">{d.label}</span>
                {d.score != null ? (
                  <span className="text-[16px] font-semibold w-num" style={{ color: 'var(--color-w-accent-2)' }}>
                    {d.score} <span className="text-[var(--color-w-muted)] text-[13px] font-normal">/ 100</span>
                  </span>
                ) : d.pct !== null ? (
                  <span
                    className="text-[16px] font-semibold w-num"
                    style={{ color: d.pct >= 0 ? 'var(--color-w-success)' : 'var(--color-w-danger)' }}
                  >
                    {d.amount !== null && (
                      <>{d.amount >= 0 ? '+' : ''}{fmt(d.amount)} · </>
                    )}
                    {d.pct >= 0 ? '+' : ''}{d.pct.toFixed(1)} %
                  </span>
                ) : (
                  <span className="text-[16px] text-[var(--color-w-faint)]">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ACCOUNT CARDS */}
      {visibleAccounts.length > 0 && (
        <>
          <div className="flex items-baseline justify-between mb-3 mt-4">
            <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-w-muted)]">Mes comptes</h2>
            <button onClick={() => setView('settings')} className="text-[12px] text-[var(--color-w-muted)] hover:text-[var(--color-w-accent-2)] transition-colors">
              Tout voir →
            </button>
          </div>
          <div
            className="grid gap-3 mb-4"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {visibleAccounts.map(acc => {
              const balance = accountBalances[acc.id] ?? 0;
              const member = members.find(m => m.id === acc.member_id);
              return (
                <button
                  key={acc.id}
                  onClick={() => onAccountClick && onAccountClick(acc.id)}
                  className="relative overflow-hidden text-left p-5 transition-transform"
                  style={{
                    aspectRatio: '1.65 / 1',
                    background: accountGradient(acc),
                    border: '1px solid rgba(255,255,255,0.10)',
                    borderRadius: 'var(--radius-w-md)',
                    color: 'white',
                    boxShadow:
                      '0 8px 24px -6px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.15), inset 0 -1px 0 rgba(0,0,0,0.2)',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = 'translateY(0)'; }}
                >
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 pointer-events-none"
                    style={{ background: 'radial-gradient(120% 80% at 0% 0%, rgba(255,255,255,0.12), transparent 50%)' }}
                  />
                  <div
                    className="absolute"
                    style={{
                      top: 14, right: 16, width: 26, height: 20, borderRadius: 4,
                      background: 'linear-gradient(135deg, rgba(255,255,255,0.4), rgba(255,255,255,0.1))',
                      opacity: 0.6,
                    }}
                  />
                  <div className="relative flex flex-col justify-between h-full">
                    <div>
                      <div className="text-[11.5px] font-semibold uppercase tracking-[0.05em] opacity-90 truncate">
                        {acc.bank || acc.name}
                      </div>
                      <div className="text-[12.5px] opacity-75 mt-0.5 truncate">
                        {acc.bank ? acc.name : (member ? member.name : 'Compte')}
                      </div>
                    </div>
                    <div>
                      <div className="text-[24px] font-bold tracking-[-0.025em] w-num">
                        {fmt(balance)}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
            <button
              onClick={() => setView('settings')}
              className="grid place-items-center text-[13px] font-medium transition-colors"
              style={{
                aspectRatio: '1.65 / 1',
                background: 'var(--bg-card)',
                border: '1px dashed var(--border-strong)',
                borderRadius: 'var(--radius-w-md)',
                color: 'var(--color-w-muted)',
              }}
              onMouseEnter={(e) => { e.currentTarget.style.color = 'var(--color-w-text)'; e.currentTarget.style.borderColor = 'var(--color-w-accent)'; }}
              onMouseLeave={(e) => { e.currentTarget.style.color = 'var(--color-w-muted)'; e.currentTarget.style.borderColor = 'var(--border-strong)'; }}
            >
              + Ajouter un compte
            </button>
          </div>
        </>
      )}

      {/* MES POSITIONS — only when there's at least one live-priced asset */}
      {(() => {
        const livePositions = visibleAssets.filter(a => a.ticker && a.quantity);
        if (livePositions.length === 0) return null;
        return (
          <>
            <div className="flex items-baseline justify-between mb-3 mt-4">
              <h2 className="text-[12px] font-semibold uppercase tracking-[0.08em] text-[var(--color-w-muted)] flex items-center gap-2">
                <span className="w-live-dot" style={{ width: 6, height: 6 }}/>
                Mes positions <span className="text-[var(--color-w-faint)] font-medium normal-case tracking-normal text-[11.5px]">· {livePositions.length} ligne{livePositions.length > 1 ? 's' : ''}</span>
              </h2>
              <button onClick={() => setView('wealth')} className="text-[12px] text-[var(--color-w-muted)] hover:text-[var(--color-w-accent-2)] transition-colors">
                Tout voir →
              </button>
            </div>
            <div className="w-glass p-5 sm:p-6 mb-4">
              <ul className="m-0 p-0 list-none flex flex-col">
                {livePositions.map(p => {
                  const change = p._liveChangePct;
                  const isUp = change != null && change >= 0;
                  const livePrice = p._livePrice;
                  return (
                    <li
                      key={p.id}
                      className="grid items-center gap-3 py-3 border-b border-[var(--color-w-border)] last:border-b-0"
                      style={{ gridTemplateColumns: '40px 1.4fr auto auto' }}
                    >
                      <div
                        className="w-10 h-10 rounded-[10px] grid place-items-center text-[13px] font-bold flex-shrink-0"
                        style={{ background: 'var(--gradient-hero)', color: 'white', boxShadow: '0 2px 8px rgba(59,111,224,0.25)' }}
                      >
                        {p.ticker.slice(0, 2)}
                      </div>
                      <div className="min-w-0">
                        <div className="text-[13.5px] font-semibold truncate flex items-center gap-2">
                          <span className="truncate">{p.name}</span>
                          {change != null && (
                            <span
                              className="inline-flex items-center px-1.5 py-0.5 rounded text-[10.5px] font-semibold flex-shrink-0"
                              style={{
                                background: isUp ? 'var(--color-w-success-soft)' : 'var(--color-w-danger-soft)',
                                color: isUp ? 'var(--color-w-success)' : 'var(--color-w-danger)',
                              }}
                            >
                              {isUp ? '↑' : '↓'} {Math.abs(change).toFixed(2)} %
                            </span>
                          )}
                        </div>
                        <div className="text-[11.5px] text-[var(--color-w-muted)] truncate font-mono" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                          {p.ticker} · {p.quantity} {p.quantity > 1 ? 'parts' : 'part'}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-[13.5px] font-semibold w-num">{fmt(p.currentValue, { from: p.currency })}</div>
                        {livePrice != null && (
                          <div className="text-[11px] text-[var(--color-w-faint)] w-num mt-0.5">
                            {fmt(livePrice, { from: p.currency })} / part
                          </div>
                        )}
                      </div>
                      <span className="w-live-dot ml-1" title="Cours live (5 min)"/>
                    </li>
                  );
                })}
              </ul>
            </div>
          </>
        );
      })()}

      {/* SPLIT — Allocation + Activité */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3 mb-4">

        {/* Allocation */}
        <div className="w-glass p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em]">Allocation</h3>
            <button onClick={() => setView('wealth')} className="text-[12px] text-[var(--color-w-muted)] hover:text-[var(--color-w-accent-2)] transition-colors">
              Détail →
            </button>
          </div>
          {allocationData.length > 0 ? (
            <div className="grid grid-cols-1 sm:grid-cols-[160px_1fr] gap-5 sm:gap-6 items-center">
              {/* Donut */}
              <div className="relative w-[160px] h-[160px] mx-auto">
                <svg viewBox="0 0 36 36" style={{ transform: 'rotate(-90deg)', width: '100%', height: '100%' }}>
                  <circle cx="18" cy="18" r="15.91" fill="none" stroke="var(--border)" strokeWidth="3.2"/>
                  {(() => {
                    let offset = 0;
                    return allocationData.map((d, i) => {
                      const pct = allocationTotal > 0 ? (d.value / allocationTotal) * 100 : 0;
                      const circle = (
                        <circle
                          key={i}
                          cx="18" cy="18" r="15.91"
                          fill="none"
                          stroke={d.color}
                          strokeWidth="3.2"
                          strokeDasharray={`${pct} 100`}
                          strokeDashoffset={-offset}
                        />
                      );
                      offset += pct;
                      return circle;
                    });
                  })()}
                </svg>
                <div className="absolute inset-0 grid place-items-center text-center">
                  <div>
                    <div className="text-[10.5px] uppercase tracking-[0.08em] text-[var(--color-w-muted)] font-semibold">Net</div>
                    <div className="text-[18px] font-bold tracking-[-0.02em] mt-1 w-num">
                      {fmt(allocationTotal).replace(/\s?€$/, '')} €
                    </div>
                  </div>
                </div>
              </div>
              {/* List */}
              <ul className="m-0 p-0 list-none flex flex-col gap-3">
                {allocationData.map(d => {
                  const pct = allocationTotal > 0 ? (d.value / allocationTotal) * 100 : 0;
                  return (
                    <li key={d.name} className="grid grid-cols-[1fr_auto] gap-3 items-center">
                      <div className="flex items-center gap-2.5 text-[13px] font-medium min-w-0">
                        <span className="block w-[10px] h-[10px] rounded-[3px] flex-shrink-0" style={{ background: d.color }}/>
                        <span className="truncate">{d.name}</span>
                      </div>
                      <div className="text-right">
                        <div className="text-[13px] font-semibold w-num">{fmt(d.value)}</div>
                        <div className="text-[11px] text-[var(--color-w-muted)] w-num mt-0.5">{pct.toFixed(0)} %</div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : (
            <p className="text-sm text-[var(--color-w-faint)] italic">Pas encore d'actifs renseignés.</p>
          )}
        </div>

        {/* Activité récente */}
        <div className="w-glass p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em]">Activité récente</h3>
            <button onClick={() => setView('transactions')} className="text-[12px] text-[var(--color-w-muted)] hover:text-[var(--color-w-accent-2)] transition-colors">
              Tout voir →
            </button>
          </div>
          {recentTx.length > 0 ? (
            <ul className="m-0 p-0 list-none flex flex-col">
              {recentTx.map(tx => {
                const cat = categories.find(c => c.id === tx.category_id);
                const acc = visibleAccounts.find(a => a.id === tx.account_id);
                const isTransfer = transferIds.has(tx.id);
                const isIn = parseFloat(tx.amount) > 0;
                return (
                  <li key={tx.id} className="grid grid-cols-[36px_1fr_auto] gap-3 items-center py-3 border-b border-[var(--color-w-border)] last:border-b-0">
                    <div
                      className="w-9 h-9 rounded-[10px] grid place-items-center text-[13px] font-bold flex-shrink-0"
                      style={{
                        background: isTransfer ? 'var(--primary-soft)' : 'var(--bg-subtle)',
                        color: isTransfer ? 'var(--color-w-accent-2)' : 'var(--color-w-text)',
                      }}
                    >
                      {isTransfer ? <ArrowRightLeft size={15}/> : (tx.description || '?').charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13px] font-medium truncate flex items-center gap-2">
                        <span className="truncate">{tx.description || '—'}</span>
                        {isTransfer && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold flex-shrink-0"
                                style={{ background: 'var(--primary-soft)', color: 'var(--color-w-accent-2)' }}>
                            Virement
                          </span>
                        )}
                      </div>
                      <div className="text-[11.5px] text-[var(--color-w-muted)] truncate">
                        {cat?.name || 'Non catégorisé'} {acc && `· ${acc.name}`}
                      </div>
                    </div>
                    <div className="text-right">
                      <div
                        className="text-[13.5px] font-semibold w-num"
                        style={{
                          color: isTransfer
                            ? 'var(--color-w-accent-2)'
                            : isIn
                            ? 'var(--color-w-success)'
                            : 'var(--color-w-text)',
                        }}
                      >
                        {isIn && !isTransfer ? '+ ' : ''}{fmt(parseFloat(tx.amount))}
                      </div>
                      <div className="text-[11px] text-[var(--color-w-faint)] w-num mt-0.5">
                        {formatDate(tx.date, { format: 'short' })}
                      </div>
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <p className="text-sm text-[var(--color-w-faint)] italic">Aucune transaction récente.</p>
          )}
        </div>

      </div>

      {/* MOUVEMENTS INTERNES */}
      {periodPairs.length > 0 && (
        <div className="w-glass p-5 sm:p-6 mb-4">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em] flex items-center gap-2">
              <ArrowRightLeft size={15} className="text-[var(--color-w-accent-2)]"/> Mouvements internes
            </h3>
            <span className="text-[12px] text-[var(--color-w-muted)] w-num">
              {periodPairs.length} virement{periodPairs.length > 1 ? 's' : ''} · {fmt(periodPairsTotal)}
            </span>
          </div>
          <ul className="m-0 p-0 list-none grid grid-cols-1 sm:grid-cols-2 gap-2">
            {periodPairs.slice(0, 6).map((p, i) => {
              const from = visibleAccounts.find(a => a.id === p.fromAccountId);
              const to = visibleAccounts.find(a => a.id === p.toAccountId);
              return (
                <li key={i} className="flex items-center justify-between gap-3 px-3 py-2.5 rounded-[8px] bg-[var(--bg-subtle)] border border-[var(--border-light)]">
                  <div className="text-[12.5px] font-medium truncate">
                    {from?.name || '—'} <span className="text-[var(--color-w-muted)]">→</span> {to?.name || '—'}
                  </div>
                  <div className="text-[12.5px] font-semibold w-num text-[var(--color-w-accent-2)] flex-shrink-0">
                    {fmt(Math.abs(p.amount))}
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* BOTTOM — Insights + Goals */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.2fr_1fr] gap-3">

        {/* Insights */}
        <div className="w-glass p-5 sm:p-6">
          <h3 className="text-[14px] font-semibold tracking-[-0.01em] mb-4">Insights</h3>
          {insights.length > 0 ? (
            <div className="flex flex-col gap-2.5">
              {insights.map((it, i) => {
                const palette = it.kind === 'success'
                  ? { bg: 'var(--color-w-success-soft)', col: 'var(--color-w-success)', icon: <TrendingUp size={16}/> }
                  : it.kind === 'warn'
                  ? { bg: 'var(--color-w-warning-soft)', col: 'var(--color-w-warning)', icon: <AlertTriangle size={16}/> }
                  : { bg: 'var(--primary-soft)', col: 'var(--color-w-accent-2)', icon: <Sparkles size={16}/> };
                return (
                  <div key={i} className="flex items-start gap-3 p-3.5 rounded-[10px]" style={{ background: 'var(--bg-subtle)', border: '1px solid var(--border-light)' }}>
                    <div className="w-9 h-9 rounded-[9px] grid place-items-center flex-shrink-0" style={{ background: palette.bg, color: palette.col }}>
                      {palette.icon}
                    </div>
                    <div className="min-w-0">
                      <div className="text-[13.5px] font-semibold mb-1">{it.title}</div>
                      <div className="text-[12.5px] text-[var(--color-w-muted)] leading-[1.5]">{it.body}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="text-sm text-[var(--color-w-faint)] italic">Pas encore d'insights — continuez à enregistrer vos données.</p>
          )}
        </div>

        {/* Goals */}
        <div className="w-glass p-5 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-[14px] font-semibold tracking-[-0.01em]">Objectifs</h3>
            <button onClick={() => setView('budgets')} className="text-[12px] text-[var(--color-w-muted)] hover:text-[var(--color-w-accent-2)] transition-colors">
              Gérer →
            </button>
          </div>
          {goals && goals.length > 0 ? (
            <ul className="m-0 p-0 list-none">
              {goals.slice(0, 4).map(g => {
                const target = parseFloat(g.target_amount) || 0;
                const current = parseFloat(g.current_amount) || 0;
                const pct = target > 0 ? Math.min(100, (current / target) * 100) : 0;
                const done = pct >= 100;
                return (
                  <li key={g.id} className="py-3 border-b border-[var(--color-w-border)] last:border-b-0">
                    <div className="flex items-center justify-between mb-2 gap-2">
                      <div className="text-[13px] font-semibold truncate">{g.name}</div>
                      <div className="text-[12px] font-bold w-num flex-shrink-0" style={{ color: done ? 'var(--color-w-success)' : 'var(--color-w-accent-2)' }}>
                        {pct.toFixed(0)} %
                      </div>
                    </div>
                    <div className="h-[6px] rounded-[3px] overflow-hidden mb-1.5" style={{ background: 'var(--bg-subtle)' }}>
                      <div
                        className="h-full rounded-[3px]"
                        style={{
                          width: `${pct}%`,
                          background: done ? 'var(--color-w-success)' : 'var(--gradient-hero)',
                          boxShadow: done ? 'none' : '0 0 12px rgba(91,141,239,0.4)',
                        }}
                      />
                    </div>
                    <div className="text-[11.5px] text-[var(--color-w-muted)] w-num">
                      {fmt(current)} / {fmt(target)}{done && ' — atteint ✓'}
                    </div>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="text-center py-4">
              <Target size={28} className="mx-auto mb-3 text-[var(--color-w-faint)]"/>
              <p className="text-sm text-[var(--color-w-muted)] mb-3">Aucun objectif défini</p>
              <button onClick={() => setView('budgets')} className="secondary-btn" style={{ height: 34, fontSize: 12 }}>
                <Plus size={13}/> Créer un objectif
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
