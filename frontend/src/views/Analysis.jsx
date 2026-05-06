// ============================================================================
// Analysis — historical evolution + top merchants + per-category drill-down
// ============================================================================
import { useState, useMemo } from 'react';
import {
  BarChart, Bar, LineChart, Line, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { formatCurrency, formatDate, monthKey } from '../utils.js';

export function Analysis({ transactions, categories, recurringIds, recurringGroups, monthlyEvolution, accounts, memberShare, fmt }) {
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
          <h1 className="page-title">Analyse</h1>
          <p className="page-subtitle">Marchands, catégories et tendances sur la durée.</p>
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
              <Bar dataKey="income" name="Revenus" fill="var(--success)" radius={[3, 3, 0, 0]} maxBarSize={28}/>
              <Bar dataKey="expenses" name="Dépenses" fill="var(--danger)" radius={[3, 3, 0, 0]} maxBarSize={28}/>
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
                <Line type="monotone" dataKey="amount" stroke="var(--primary)" strokeWidth={2} dot={{ r: 2.5, fill: 'var(--primary)' }} activeDot={{ r: 4 }}/>
              </LineChart>
            </ResponsiveContainer>
          ) : <div className="chart-empty">Aucune donnée</div>}
        </section>
      </div>
    </div>
  );
}
