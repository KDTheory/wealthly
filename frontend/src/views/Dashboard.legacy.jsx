// ============================================================================
// Dashboard — landing view: net worth hero + KPIs + composition + recent
// ============================================================================
import { useMemo } from 'react';
import {
  AreaChart, Area, PieChart, Pie, Cell, ResponsiveContainer, Tooltip,
} from 'recharts';
import {
  Upload, Plus, TrendingUp, TrendingDown, Wallet, CreditCard, Users,
  ChevronRight, AlertTriangle, PiggyBank, Sparkles, Zap, ArrowUp, ArrowDown,
  FileText, Landmark,
} from 'lucide-react';
import { ASSET_CLASS_MAP } from '../constants.js';
import { formatCurrency, formatDate } from '../utils.js';
import { AnimatedNumber } from '../components/AnimatedNumber.jsx';
import { NetWorthChart } from '../components/NetWorthChart.jsx';
import { HealthScore } from '../components/HealthScore.jsx';

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
  const m1Positive = perf.m1 === null ? null : perf.m1 >= 0;

  // Card primitives — Tailwind classes referencing the design tokens.
  const cardCls = 'bg-[var(--color-w-surface)] border border-[var(--color-w-border)] rounded-[var(--radius-w-lg)]';
  const labelCls = 'text-[11px] uppercase tracking-[0.08em] text-[var(--color-w-muted)] font-medium';

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

      {/* HERO — net worth giant + sparkline backdrop */}
      <section className="mb-4">
        <div className="relative overflow-hidden bg-[var(--color-w-surface)] border border-[var(--color-w-border-strong)] rounded-[var(--radius-w-xl)] px-6 sm:px-10 pt-7 sm:pt-9 pb-7 sm:pb-9 border-t-2 border-t-[var(--color-w-accent)]">
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

            <div className="w-serif text-[clamp(54px,10vw,98px)] leading-[1] font-normal tracking-[-0.028em] w-num text-[var(--color-w-text)] mt-3">
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
          <div className={`w-serif text-[28px] leading-none font-normal w-num mt-2 ${perf.m3 === null ? 'text-[var(--color-w-faint)]' : perf.m3 >= 0 ? 'text-[var(--color-w-text)]' : 'text-[var(--color-w-danger)]'}`}>
            {perf.m3 !== null ? `${perf.m3 >= 0 ? '+' : ''}${perf.m3.toFixed(1)}%` : '—'}
          </div>
        </div>

        {liabilitiesValue > 0 ? (
          <div className={`${cardCls} px-5 py-4`}>
            <div className="flex items-center justify-between">
              <span className={labelCls}>Ratio d'endettement</span>
              <CreditCard size={14} className="text-[var(--color-w-faint)]"/>
            </div>
            <div className="w-serif text-[28px] leading-none font-normal w-num mt-2 text-[var(--color-w-text)]">
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
            <div className={`w-serif text-[28px] leading-none font-normal w-num mt-2 ${thisMonthStats.net >= 0 ? 'text-[var(--color-w-text)]' : 'text-[var(--color-w-danger)]'}`}>
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
          <div className="w-serif text-[28px] leading-none font-normal w-num mt-2 text-[var(--color-w-text)]">
            {liquidityRatio !== null ? `${liquidityRatio.toFixed(0)}%` : '—'}
          </div>
          <div className="text-[11px] text-[var(--color-w-faint)] mt-1">disponibles immédiatement</div>
        </div>
      </section>

      {/* Score santé financière — gauge + 5-criteria breakdown */}
      <div className="mb-5">
        <HealthScore
          monthlyEvolution={monthlyEvolution}
          liquidWealth={liquidWealth}
          assetsValue={assetsValue}
          liabilitiesValue={liabilitiesValue}
          visibleAssets={visibleAssets}
          budgets={budgets}
          categoryAnalysis={categoryAnalysis}
        />
      </div>

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
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-w-border)]">
              <h3 className="w-section-h"><span className="w-roman">I</span>— Allocation</h3>
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
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-[var(--color-w-border)]">
              <h3 className="w-section-h"><span className="w-roman">II</span>— Top dépenses du mois</h3>
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
              <h3 className="w-section-h"><span className="w-roman">III</span>— Comptes</h3>
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
              <h3 className="w-section-h"><span className="w-roman">IV</span>— Activité récente</h3>
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
