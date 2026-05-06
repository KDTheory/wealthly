// ============================================================================
// Monthly — fixed charges, anomalies, reste à vivre, monthly flow chart
// ============================================================================
import { useState, useMemo, useEffect } from 'react';
import {
  ComposedChart, Bar, Line, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import {
  Plus, Trash2, Edit3, Check, AlertTriangle, Repeat, Sparkles, Lightbulb,
  TrendingUp, ArrowUp, ArrowDown, Minus, Activity, BarChart3,
} from 'lucide-react';
import { formatCurrency, formatDate, monthKey } from '../utils.js';
import { AnimatedNumber } from '../components/AnimatedNumber.jsx';

export function Monthly({ transactions, accounts, categories, members, recurringIds, recurringGroups, monthlyEvolution, thisMonthStats, anomalies, categoryAnalysis, fixedCharges, saveFixedCharge, deleteFixedCharge, memberShare, currentMonth, fmt }) {
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

function FixedChargeEditor({ charge, categories, members, currentMonth, onSave, onCancel }) { // local — only used by <Monthly>
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

