// ============================================================================
// NetWorthChart — used by Dashboard + Wealth.
//
// Brut/Net/Financier toggle, period selector, evolution / performance views.
// Memoized because parent re-renders happen frequently and the AreaChart is
// the most expensive node on the page.
// ============================================================================
import React, { useState, useMemo } from 'react';
import {
  AreaChart, Area, ResponsiveContainer, XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import { Activity } from 'lucide-react';
import { formatCurrency, formatDate } from '../utils.js';

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

export const NetWorthChart = React.memo(function NetWorthChart({ snapshots = [], fmt }) {
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
      const finVal = fin != null ? fin : (liquid + Math.max(0, assets - (re || 0)));
      const finDebt = otherDebt != null ? otherDebt : (mortgage == null ? 0 : Math.max(0, liabilities - mortgage));
      return finVal - finDebt;
    }
    return s.net_worth || (liquid + assets - liabilities);
  };

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
