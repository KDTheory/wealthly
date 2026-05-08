// ============================================================================
// Dashboard — landing view: net worth hero + KPIs + composition + recent
// ============================================================================
import { useMemo } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Upload, Plus, Users, ChevronRight, AlertTriangle, Zap, ArrowUp, ArrowDown,
  FileText, Landmark,
} from 'lucide-react';
import { ASSET_CLASS_MAP } from '../constants.js';
import { formatCurrency, formatDate } from '../utils.js';
import { AnimatedNumber } from '../components/AnimatedNumber.jsx';
import { NetWorthChart } from '../components/NetWorthChart.jsx';
import { computeHealthScore } from '../components/HealthScore.jsx';

export function Dashboard({ netWorth, liquidWealth, assetsValue, liabilitiesValue, thisMonthStats, monthlyEvolution, visibleAccounts, accountBalances, visibleAssets, visibleLiabilities, members, activeMemberId, transactions, categories, fmt, memberShare, categoryAnalysis, anomalies, cashflowProjection, goals, budgets = {}, wealthHistory = [], recurringGroups, currentMonth, setView, onAccountClick }) {
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

  // Méridien: YTD performance — compare current netWorth to first snapshot of the year.
  const ytdPerf = useMemo(() => {
    const yearPrefix = `${new Date().getFullYear()}-`;
    const sorted = [...monthlyEvolution].sort((a, b) => a.month.localeCompare(b.month));
    const yearStart = sorted.find(m => m.month.startsWith(yearPrefix));
    if (!yearStart || !yearStart.balance) return { pct: null, amount: null };
    const amount = netWorth - yearStart.balance;
    const pct = (amount / Math.abs(yearStart.balance)) * 100;
    return { pct, amount };
  }, [monthlyEvolution, netWorth]);

  // Pre-computed health score so we can render the Méridien panel directly
  // instead of using the legacy gauge wrapper.
  const health = useMemo(
    () => computeHealthScore({ monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, budgets, categoryAnalysis }),
    [monthlyEvolution, liquidWealth, assetsValue, liabilitiesValue, visibleAssets, budgets, categoryAnalysis]
  );
  const healthRating = health.total < 40 ? 'À surveiller' : health.total < 70 ? 'Correct' : 'Solide';
  const healthColor = health.total < 40 ? 'var(--color-w-danger)' : health.total < 70 ? 'var(--color-w-warning)' : 'var(--color-w-success)';

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
          <h1 className="w-serif text-[clamp(38px,5.5vw,58px)] leading-[1.04] font-normal tracking-[-0.02em] text-[var(--color-w-text)] mb-4">
            {activeMember ? `Bonjour ${activeMember.name}.` : 'Votre patrimoine,'}<br/>
            <span className="w-serif-italic text-[var(--color-w-accent)]">consolidé en quelques minutes.</span>
          </h1>
          <p className="text-[var(--color-w-muted)] leading-relaxed mb-7 max-w-md">
            Importez vos relevés ou saisissez vos actifs. Tout reste chiffré, hébergé chez vous.
          </p>
          <div className="flex flex-col gap-3 w-full max-w-sm">
            <div className="flex gap-3">
              <button onClick={() => setView('import')} className="flex-1 inline-flex items-center justify-center gap-2 px-4 h-11 rounded-[var(--radius-w-md)] bg-[var(--color-w-accent)] text-[#0a0a0c] font-medium hover:bg-[var(--color-w-accent-hover)] transition-colors">
                <Upload size={15}/> Importer un relevé
              </button>
              <button onClick={() => setView('wealth')} className="flex-1 inline-flex items-center justify-center gap-2 px-4 h-11 rounded-[var(--radius-w-md)] border border-[var(--color-w-border-strong)] text-[var(--color-w-text)] hover:bg-[var(--color-w-surface-2)] transition-colors">
                <Plus size={14}/> Saisir un actif
              </button>
            </div>
            <button onClick={() => setView('settings')} className="inline-flex items-center justify-center gap-2 px-4 h-10 rounded-[var(--radius-w-md)] border border-[var(--color-w-border)] text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] hover:border-[var(--color-w-border-strong)] transition-colors text-sm">
              <Landmark size={14}/> Connecter ma banque
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
  // Card primitives — Tailwind classes referencing the design tokens.
  const cardCls = 'bg-[var(--color-w-surface)] border border-[var(--color-w-border)] rounded-[var(--radius-w-lg)]';

  // Méridien: quarter label for the statement eyebrow ("Relevé · T2 2026").
  const quarter = (() => {
    const d = new Date();
    return `T${Math.floor(d.getMonth() / 3) + 1} ${d.getFullYear()}`;
  })();

  return (
    <div className="w-redesign font-sans">
      {/* Statement eyebrow + editorial title (Méridien) */}
      <div className="mb-3">
        <div className="w-eyebrow mb-3">Relevé · {quarter}</div>
        <h1 className="w-serif text-[clamp(40px,5.4vw,60px)] leading-[1.04] font-normal tracking-[-0.018em] text-[var(--color-w-muted)] m-0">
          Position <span className="w-serif-italic text-[var(--color-w-accent)]">en un coup d'œil</span>.
        </h1>
      </div>

      {/* Top bar: subtle greeting + utility actions only — no redundant page title */}
      <div className="flex items-center justify-between flex-wrap gap-3 mb-5 mt-5">
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
            className="inline-flex items-center gap-2 px-3 h-8 rounded-md border border-[var(--color-w-border)] text-xs text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] hover:border-[var(--color-w-border-strong)] transition-colors"
            title="Télécharger le bilan en PDF"
          >
            <FileText size={12}/>
            <span>Bilan PDF</span>
          </button>
        </div>
      </div>

      {/* === Méridien layout — fidèle PDF B === */}

      {/* Hero row: title (left) + curve (right) on the same line */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.25fr_1fr] gap-x-12 gap-y-6 items-end mb-5">
        <div>
          {/* the editorial title is rendered above; this column carries the subtitle paragraph */}
          <p className="text-[14px] leading-[1.65] text-[var(--color-w-muted)] max-w-[600px]">
            Patrimoine consolidé sur <span className="text-[var(--color-w-text)]">{visibleAccounts.length} compte{visibleAccounts.length > 1 ? 's' : ''}</span>.
            {perf.m1 !== null && (
              <> Variation sur 30 jours : <span className="text-[var(--color-w-text)] w-num">{perf.m1 >= 0 ? '+' : ''}{perf.m1.toFixed(2)} %</span>.</>
            )}
            {ytdPerf.pct !== null && (
              <> Depuis le début d'année : <span className="text-[var(--color-w-text)] w-num">{ytdPerf.pct >= 0 ? '+' : ''}{ytdPerf.pct.toFixed(2)} %</span>.</>
            )}
          </p>
        </div>

        {monthlyEvolution.length >= 2 && (
          <div className="relative h-[140px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyEvolution.slice(-12)} margin={{ top: 8, right: 4, left: 4, bottom: 4 }}>
                <defs>
                  <linearGradient id="hero-area" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="var(--color-w-accent)" stopOpacity="0.22"/>
                    <stop offset="100%" stopColor="var(--color-w-accent)" stopOpacity="0"/>
                  </linearGradient>
                </defs>
                <Area type="monotone" dataKey="balance" stroke="var(--color-w-accent)" strokeWidth={1.4} strokeOpacity={1} fill="url(#hero-area)"/>
                <Tooltip contentStyle={{ background: 'var(--color-w-surface-2)', border: '1px solid var(--color-w-border-strong)', borderRadius: 8, fontSize: 11, color: 'var(--color-w-text)' }} formatter={(v) => formatCurrency(v)} labelFormatter={(l) => formatDate(l + '-01', { format: 'monthYear' })}/>
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>

      {/* Gold rule — start of the statement body */}
      <div className="relative h-px bg-[var(--color-w-border)] mt-2 mb-8">
        <span className="absolute left-0 top-0 h-px w-16 bg-[var(--color-w-accent)]"/>
      </div>

      {/* TOTAL NET WORTH band — number + 3 inline deltas */}
      <section className="mb-12">
        <div className="w-eyebrow mb-4">Patrimoine net total</div>
        <div className="flex flex-wrap items-end gap-x-12 gap-y-6">
          <div className="w-serif text-[clamp(54px,9.5vw,96px)] leading-[1] font-normal tracking-[-0.028em] w-num text-[var(--color-w-text)]">
            <AnimatedNumber value={netWorth} format={(v) => fmt(v)}/>
          </div>
          <div className="flex flex-wrap gap-x-10 gap-y-4 pb-2">
            {[
              { label: '30 jours', pct: perf.m1, amount: perf.m1 !== null && monthlyEvolution.length >= 2 ? netWorth - monthlyEvolution[monthlyEvolution.length - 2].balance : null },
              { label: '3 mois', pct: perf.m3, amount: perf.m3 !== null && monthlyEvolution.length >= 4 ? netWorth - monthlyEvolution[monthlyEvolution.length - 4].balance : null },
              { label: 'YTD', pct: ytdPerf.pct, amount: ytdPerf.amount },
            ].map(d => (
              <div key={d.label} className="flex flex-col gap-1">
                <span className="text-[10px] uppercase tracking-[0.22em] text-[var(--color-w-muted)] font-medium">{d.label}</span>
                {d.pct !== null ? (
                  <>
                    <span className="w-serif italic text-[26px] leading-none font-medium w-num" style={{ color: d.pct >= 0 ? 'var(--color-w-success)' : 'var(--color-w-danger)' }}>
                      {d.pct >= 0 ? '+' : ''}{d.pct.toFixed(2)} %
                    </span>
                    {d.amount !== null && (
                      <span className="text-[11.5px] text-[var(--color-w-faint)] w-num">{d.amount >= 0 ? '+' : ''}{fmt(d.amount)}</span>
                    )}
                  </>
                ) : (
                  <span className="w-serif italic text-[26px] leading-none font-normal text-[var(--color-w-faint)]">—</span>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Three numbered sections side-by-side, separated by vertical rules */}
      <section className="grid grid-cols-1 lg:grid-cols-[1.4fr_1fr_1fr] gap-y-10 lg:gap-y-0 mb-12 lg:pt-7 pt-7 border-t border-[var(--color-w-border)]">

        {/* I — Allocation */}
        <div className="lg:pr-8 lg:border-r border-[var(--color-w-border)]">
          <div className="flex items-baseline justify-between mb-4">
            <h3 className="w-section-h"><span className="w-roman">I</span>— Allocation</h3>
            <button onClick={() => setView('wealth')} className="text-xs text-[var(--color-w-muted)] hover:text-[var(--color-w-text)] inline-flex items-center gap-1 transition-colors">
              Détails <ChevronRight size={12}/>
            </button>
          </div>
          {allocationData.length > 0 ? (
            <>
              <div className="h-[6px] rounded-[3px] overflow-hidden flex mb-4">
                {allocationData.map((d, i) => {
                  const pct = allocationTotal > 0 ? (d.value / allocationTotal) * 100 : 0;
                  return <div key={i} style={{ width: `${pct}%`, background: d.color }}/>;
                })}
              </div>
              <ul className="m-0 p-0 list-none">
                {allocationData.map(d => {
                  const pct = allocationTotal > 0 ? (d.value / allocationTotal) * 100 : 0;
                  return (
                    <li key={d.name} className="grid grid-cols-[12px_1fr_auto_auto] items-baseline gap-3 py-[9px] text-[13px] border-b border-dotted border-[var(--color-w-border)] last:border-b-0">
                      <span className="block w-[10px] h-[10px] rounded-[2px]" style={{ background: d.color }}/>
                      <span className="text-[var(--color-w-text)] truncate">{d.name}</span>
                      <span className="w-serif italic text-[14px] text-[var(--color-w-muted)] w-num min-w-[56px] text-right">{pct.toFixed(1)} %</span>
                      <span className="text-[12px] text-[var(--color-w-faint)] w-num min-w-[88px] text-right">{fmt(d.value)}</span>
                    </li>
                  );
                })}
              </ul>
            </>
          ) : (
            <p className="text-sm text-[var(--color-w-faint)] italic">Pas encore d'actifs renseignés.</p>
          )}
        </div>

        {/* II — Santé financière */}
        <div className="lg:px-8 lg:border-r border-[var(--color-w-border)]">
          <h3 className="w-section-h mb-4"><span className="w-roman">II</span>— Santé</h3>
          <div className="w-serif text-[64px] leading-none font-normal tracking-[-0.02em] text-[var(--color-w-text)] w-num">
            {health.total}<span className="w-serif italic text-[22px] text-[var(--color-w-muted)] ml-1">/100</span>
          </div>
          <div className="text-[10.5px] uppercase tracking-[0.14em] mt-2 font-semibold" style={{ color: healthColor }}>{healthRating}</div>
          <div className="text-[12.5px] text-[var(--color-w-muted)] mt-3 leading-[1.55] w-serif italic max-w-[240px]">
            {health.total >= 70 ? 'Posture financière solide.' : health.total >= 40 ? 'Quelques pistes d\'amélioration.' : 'Plusieurs critères à renforcer.'}
          </div>
          <ul className="m-0 mt-5 p-0 list-none flex flex-col gap-[10px]">
            {health.items.map(it => (
              <li key={it.key} className="grid grid-cols-[1fr_70px_28px] items-center gap-[10px] text-[12px]" title={it.hint}>
                <span className="text-[var(--color-w-text)]">{it.label}</span>
                <span className="h-[3px] bg-[var(--color-w-surface-3)] rounded-[2px] overflow-hidden block">
                  <span className="block h-full" style={{ width: `${(it.pts / it.max) * 100}%`, background: it.ok ? 'var(--color-w-accent)' : 'var(--color-w-danger)' }}/>
                </span>
                <span className="text-[var(--color-w-faint)] text-[11px] text-right w-num">{Math.round(it.pts)}/{it.max}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* III — Trésorerie */}
        <div className="lg:pl-8">
          <h3 className="w-section-h mb-4"><span className="w-roman">III</span>— Trésorerie</h3>
          <div className="w-serif text-[44px] leading-none font-normal tracking-[-0.02em] text-[var(--color-w-text)] w-num">
            {fmt(liquidWealth)}
          </div>
          <div className="text-[12px] text-[var(--color-w-muted)] mt-2 w-serif italic">
            {liquidityRatio !== null ? `${liquidityRatio.toFixed(0)} % du patrimoine net` : 'sur les comptes liquides'}
          </div>
          <ul className="m-0 mt-5 p-0 list-none flex flex-col">
            {thisMonthStats.income > 0 && (
              <li className="flex justify-between py-[9px] text-[12.5px] border-b border-dotted border-[var(--color-w-border)]">
                <span className="text-[var(--color-w-text)]">Entrées · ce mois</span>
                <span className="text-[var(--color-w-text)] w-num">+{fmt(thisMonthStats.income)}</span>
              </li>
            )}
            {thisMonthStats.expenses > 0 && (
              <li className="flex justify-between py-[9px] text-[12.5px] border-b border-dotted border-[var(--color-w-border)]">
                <span className="text-[var(--color-w-text)]">Sorties · ce mois</span>
                <span className="text-[var(--color-w-text)] w-num">−{fmt(thisMonthStats.expenses)}</span>
              </li>
            )}
            <li className="flex justify-between py-[9px] text-[12.5px] border-b border-dotted border-[var(--color-w-border)]">
              <span className="text-[var(--color-w-text)]">Épargne nette</span>
              <span className="w-serif italic text-[14px] w-num" style={{ color: thisMonthStats.net >= 0 ? 'var(--color-w-accent)' : 'var(--color-w-danger)' }}>
                {thisMonthStats.net >= 0 ? '+' : ''}{fmt(thisMonthStats.net)}
              </span>
            </li>
            {thisMonthStats.income > 0 && (
              <li className="flex justify-between py-[9px] text-[12.5px] border-b border-dotted border-[var(--color-w-border)]">
                <span className="text-[var(--color-w-text)]">Taux d'épargne</span>
                <span className="text-[var(--color-w-text)] w-num">{((thisMonthStats.net / thisMonthStats.income) * 100).toFixed(1)} %</span>
              </li>
            )}
            {liabilitiesValue > 0 && debtRatio !== null && (
              <li className="flex justify-between py-[9px] text-[12.5px]">
                <span className="text-[var(--color-w-text)]">Ratio d'endettement</span>
                <span className="text-[var(--color-w-text)] w-num">{debtRatio.toFixed(1)} %</span>
              </li>
            )}
          </ul>
          {/* Account-role exclusion footer — surface excluded accounts so the
              user understands why the cashflow numbers may look different
              from a naive "sum all transactions" view. */}
          {(() => {
            const excluded = visibleAccounts.filter(a => a.role && a.role !== 'principal');
            if (excluded.length === 0) return null;
            return (
              <div className="mt-4 pt-3 border-t border-dotted border-[var(--color-w-border)] text-[11px] text-[var(--color-w-faint)] leading-[1.55] w-serif italic">
                Exclus du calcul mensuel :{' '}
                {excluded.map((a, i) => (
                  <span key={a.id}>
                    {i > 0 && ', '}
                    <span className="text-[var(--color-w-muted)] not-italic">{a.name}</span>
                    <span className="text-[var(--color-w-faint)]"> ({a.role})</span>
                  </span>
                ))}
                .
              </div>
            );
          })()}
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

      {/* Top dépenses (section IV) */}
      <div className="mb-5">
        {topCategoriesThisMonth.length > 0 && (
          <section className={`${cardCls} p-6`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-w-border)]">
              <h3 className="w-section-h"><span className="w-roman">IV</span>— Top dépenses du mois</h3>
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
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-w-border)]">
              <h3 className="w-section-h"><span className="w-roman">V</span>— Comptes</h3>
              <span className="text-xs text-[var(--color-w-faint)]">{visibleAccounts.length}</span>
            </div>
            <div className="divide-y divide-[var(--color-w-border)]">
              {visibleAccounts.map(a => {
                const ownerNames = (a.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');
                const sharedBalance = (accountBalances[a.id] || 0) * memberShare(a);
                const isJoint = a.memberIds && a.memberIds.length > 1;
                const ownerColor = isJoint ? 'var(--color-w-asset-pension)' : (members.find(m => m.id === a.memberIds?.[0])?.color || 'var(--color-w-muted)');
                return (
                  <button
                    key={a.id}
                    type="button"
                    onClick={() => onAccountClick && onAccountClick(a)}
                    className="w-full text-left flex items-center gap-3 py-3 first:pt-0 last:pb-0 -mx-1 px-1 rounded-md hover:bg-[var(--color-w-surface-2)] transition-colors cursor-pointer"
                  >
                    <div className="w-9 h-9 rounded-[var(--radius-w-sm)] flex items-center justify-center text-xs font-semibold text-white shrink-0" style={{ background: ownerColor }}>
                      {isJoint ? <Users size={13}/> : (a.bank?.charAt(0)?.toUpperCase() || '·')}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-sm text-[var(--color-w-text)] truncate">{a.name}</div>
                      <div className="text-xs text-[var(--color-w-muted)] truncate">{a.bank} · {ownerNames}{isJoint ? ' · joint' : ''}</div>
                    </div>
                    <div className={`text-sm w-num ${sharedBalance < 0 ? 'text-[var(--color-w-danger)]' : 'text-[var(--color-w-text)]'}`}>{fmt(sharedBalance)}</div>
                    <ChevronRight size={14} className="text-[var(--color-w-faint)]"/>
                  </button>
                );
              })}
            </div>
          </section>
        )}

        {recentTx.length > 0 && (
          <section className={`${cardCls} p-6`}>
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-w-border)]">
              <h3 className="w-section-h"><span className="w-roman">VI</span>— Activité récente</h3>
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
