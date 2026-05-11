// ============================================================================
// Cashflow — Sankey + donut for income/expense flows over a chosen period
// ============================================================================
import React, { useState, useMemo } from 'react';
import {
  ResponsiveContainer, Sankey, Layer, Rectangle, Tooltip,
  PieChart, Pie, Cell,
} from 'recharts';
import { Activity, ChevronLeft, ChevronRight } from 'lucide-react';
import { formatDate, monthKey, formatCurrency } from '../utils.js';
import { useIsNarrow } from '../hooks/useIsNarrow.js';

export function Cashflow({ transactions, categories, accounts, memberShare, fmt, currentMonth }) {
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
      <div className="subview-header">
        <div>
          <h1>Cashflow</h1>
          <p>Entrées, sorties et soldes nets — visualisés sur la période.</p>
        </div>
      </div>
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
