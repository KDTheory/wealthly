// ============================================================================
// Wealth — assets + liabilities, with sub-view filter, allocation donut,
// detail editors and the wealth-history chart.
//
// Includes the full editor cascade (CompletePatrimoinePicker, AssetEditor,
// SimpleAssetEditor, RealEstateEditor with its 5-step wizard, LiabilityEditor
// with its own 5-step wizard, LiabilityDetail) — they're tightly coupled and
// only invoked from this view, so colocating keeps prop-drilling sane.
// ============================================================================
import { useState, useMemo, useEffect } from 'react';
import {
  PieChart, Pie, Cell, AreaChart, Area, ResponsiveContainer,
  XAxis, YAxis, CartesianGrid, Tooltip,
} from 'recharts';
import {
  Plus, Trash2, Edit3, Check, ChevronLeft, ChevronRight, Home, Landmark,
  Wallet, CreditCard, Users, Sparkles, Lightbulb, BarChart3,
  Bitcoin, PiggyBank, Target, Coins, Heart,
} from 'lucide-react';
import {
  ASSET_TYPES, ASSET_CLASS_MAP, LIABILITY_TYPES,
} from '../constants.js';
import { formatCurrency, formatDate } from '../utils.js';
import { AnimatedNumber } from '../components/AnimatedNumber.jsx';
import { NetWorthChart } from '../components/NetWorthChart.jsx';
import { RegulatoryCaps } from '../components/RegulatoryCaps.jsx';

// ============================================================================
// WEALTH (Assets + Liabilities)
// ============================================================================
// Map of wealth sub-views to the asset types they include.
// 'all' shows everything (the current Patrimoine page); others narrow the
// view to a Finary-style class detail.
const WEALTH_SUBVIEWS = [
  { key: 'all',         label: 'Tout',         types: null,                                icon: BarChart3 },
  { key: 'real_estate', label: 'Immobilier',   types: ['real_estate'],                     icon: Home },
  { key: 'equities',    label: 'Actions & Fonds', types: ['pea', 'stocks'],                icon: Landmark },
  { key: 'crypto',      label: 'Crypto',       types: ['crypto'],                          icon: Bitcoin },
  { key: 'savings',     label: 'Épargne',      types: ['savings_account', 'life_insurance'], icon: PiggyBank },
  { key: 'retirement',  label: 'Retraite',     types: ['per'],                             icon: Target },
  { key: 'liabilities', label: 'Emprunts',     types: [],                                  icon: CreditCard },
  { key: 'other',       label: 'Autres actifs', types: ['other_asset'],                    icon: Coins },
];

export function Wealth({ assets, liabilities, members, activeMemberId, visibleAssets, visibleLiabilities, saveAsset, deleteAsset, saveLiability, deleteLiability, memberShare, fmt, wealthHistory = [] }) {
  const [editingAsset, setEditingAsset] = useState(null);
  const [editingLia, setEditingLia] = useState(null);
  const [viewingLia, setViewingLia] = useState(null);
  const [subview, setSubview] = useState('all');
  const [showAddPicker, setShowAddPicker] = useState(false);

  const currentSub = WEALTH_SUBVIEWS.find(s => s.key === subview) || WEALTH_SUBVIEWS[0];
  const isAll = subview === 'all';
  const isLiabilitiesOnly = subview === 'liabilities';

  // Apply the subview filter to assets
  const filteredAssets = useMemo(() => {
    if (isAll || isLiabilitiesOnly) return visibleAssets;
    if (!currentSub.types) return visibleAssets;
    return visibleAssets.filter(a => currentSub.types.includes(a.type));
  }, [visibleAssets, currentSub.types, isAll, isLiabilitiesOnly]);
  const filteredLiabilities = isAll || isLiabilitiesOnly ? visibleLiabilities : [];

  const assetsByType = useMemo(() => {
    const groups = {};
    filteredAssets.forEach(a => {
      if (!groups[a.type]) groups[a.type] = [];
      groups[a.type].push(a);
    });
    return groups;
  }, [filteredAssets]);

  const subviewTotal = filteredAssets.reduce((s, a) => s + (parseFloat(a.currentValue) || 0) * memberShare(a), 0);
  const subviewLiabTotal = filteredLiabilities.reduce((s, l) => s + (parseFloat(l.remainingCapital) || 0) * memberShare(l), 0);

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
          <p className="page-subtitle">Actifs, passifs, allocation par classe.</p>
        </div>
        <button className="primary-btn" onClick={() => setShowAddPicker(true)}><Plus size={14}/> Compléter mon patrimoine</button>
      </div>

      <nav className="wealth-subnav">
        {WEALTH_SUBVIEWS.map(s => {
          const Icon = s.icon;
          let count = 0;
          if (s.key === 'all') count = visibleAssets.length + visibleLiabilities.length;
          else if (s.key === 'liabilities') count = visibleLiabilities.length;
          else if (s.types) count = visibleAssets.filter(a => s.types.includes(a.type)).length;
          return (
            <button
              key={s.key}
              className={`wealth-subnav-btn ${subview === s.key ? 'active' : ''}`}
              onClick={() => setSubview(s.key)}
            >
              <Icon size={14}/>
              <span>{s.label}</span>
              {count > 0 && <span className="wealth-subnav-count">{count}</span>}
            </button>
          );
        })}
      </nav>

      {/* Subview header (when not 'all') */}
      {!isAll && (
        <section className="card subview-hero">
          <div className="subview-hero-info">
            <div className="subview-hero-label">{currentSub.label}</div>
            <div className="subview-hero-value">{fmt(isLiabilitiesOnly ? subviewLiabTotal : subviewTotal)}</div>
            <div className="subview-hero-meta">
              {isLiabilitiesOnly
                ? `${filteredLiabilities.length} prêt${filteredLiabilities.length > 1 ? 's' : ''} · ${fmt(visibleLiabilities.reduce((s, l) => s + (parseFloat(l.monthlyPayment) || 0) * memberShare(l), 0))} / mois`
                : `${filteredAssets.length} actif${filteredAssets.length > 1 ? 's' : ''} · ${totalAssets > 0 ? ((subviewTotal / totalAssets) * 100).toFixed(0) : 0}% du patrimoine`}
            </div>
          </div>
        </section>
      )}

      {/* Patrimoine history with brut / net / financier toggle */}
      {isAll && wealthHistory.length >= 1 && (
        <section className="card chart-card">
          <NetWorthChart snapshots={wealthHistory} fmt={fmt}/>
        </section>
      )}

      {/* Private wealth KPI strip */}
      {isAll && totalAssets > 0 && (
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
              <div className="wk-meta">{debtRatioWealth < 30 ? 'Faible' : debtRatioWealth < 50 ? 'Modéré' : 'Élevé'}</div>
            </div>
          )}
          {illiquidRatio !== null && (
            <div className="wk-card">
              <div className="wk-label">Part immobilier</div>
              <div className="wk-value">{illiquidRatio.toFixed(1)}%</div>
              <div className="wk-meta">{illiquidRatio > 70 ? 'Peu diversifié' : 'Équilibré'}</div>
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

      {/* Plafonds régulés — only on 'all', renders nothing if no PEA/Livret A/LDDS detected */}
      {isAll && (
        <RegulatoryCaps visibleAssets={visibleAssets} memberShare={memberShare} fmt={fmt}/>
      )}

      {/* Asset class allocation — only on 'all' */}
      {isAll && classAllocation.length > 0 && (
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

      {isAll && (
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
      )}

      {!isLiabilitiesOnly && (
      <section className="card">
        <div className="card-header">
          <h3><Wallet size={16}/> {isAll ? 'Actifs' : currentSub.label}</h3>
          <button className="secondary-btn" onClick={() => setEditingAsset({ id: null, type: currentSub.types?.[0] || 'real_estate', name: '', currentValue: 0, memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', updatedAt: new Date().toISOString() })}>
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
                    const share = memberShare(a);
                    const current = (parseFloat(a.currentValue) || 0) * share;
                    const cost = (parseFloat(a.purchasePrice) || 0) * share;
                    const hasCost = cost > 0;
                    const gain = hasCost ? current - cost : null;
                    const gainPct = hasCost ? (gain / cost) * 100 : null;
                    const positive = gain != null && gain >= 0;
                    return (
                      <div key={a.id} className="asset-card-v2">
                        <div className="asset-card-main">
                          <div className="asset-card-name">{a.name}</div>
                          <div className="asset-card-meta">{owners} · MAJ {formatDate(a.updatedAt)}</div>
                          {a.notes && <div className="asset-card-notes">{a.notes}</div>}
                        </div>
                        <div className="asset-card-value-block">
                          <div className="asset-card-value">{fmt(current)}</div>
                          {gain != null && (
                            <div
                              className={`asset-card-pv w-num ${positive ? 'positive' : 'negative'}`}
                              title={`Prix de revient : ${fmt(cost)}${a.purchaseDate ? ` (${formatDate(a.purchaseDate, { format: 'long' })})` : ''}`}
                            >
                              {positive ? '+' : ''}{fmt(gain)} <span className="asset-card-pv-pct">({positive ? '+' : ''}{gainPct.toFixed(1)}%)</span>
                            </div>
                          )}
                        </div>
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
      )}

      {(isAll || isLiabilitiesOnly) && (
      <section className="card">
        <div className="card-header">
          <h3><CreditCard size={16}/> Prêts en cours</h3>
          <button className="secondary-btn" onClick={() => setEditingLia({ id: null, type: 'mortgage', name: '', initialCapital: '', remainingCapital: '', monthlyPayment: '', interestRate: '', endDate: '', memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', downPayment: '', insuranceRate: '', applicationFees: '', ownershipPct: 100, durationMonths: '', startDate: '', linkedAssetId: '' })}>
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
                <div key={l.id} className="liability-card-v2 clickable" onClick={() => setViewingLia(l)}>
                  <div className="lia-header">
                    <div className="lia-icon" style={{ background: type.color + '22', color: type.color }}><Icon size={14}/></div>
                    <div className="lia-name-block">
                      <span className="lia-name">{l.name}</span>
                      <span className="lia-type">{type.name}</span>
                    </div>
                    <div className="lia-actions" onClick={(e) => e.stopPropagation()}>
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
      )}

      {editingAsset && <AssetEditor asset={editingAsset} members={members} liabilities={visibleLiabilities} onSave={(a) => { saveAsset(a); setEditingAsset(null); }} onCancel={() => setEditingAsset(null)}/>}
      {editingLia && <LiabilityEditor liability={editingLia} members={members} assets={assets} onSave={(l) => { saveLiability(l); setEditingLia(null); }} onCancel={() => setEditingLia(null)}/>}
      {viewingLia && <LiabilityDetail liability={viewingLia} assets={assets} members={members} memberShare={memberShare} fmt={fmt} onEdit={() => { setEditingLia(viewingLia); setViewingLia(null); }} onClose={() => setViewingLia(null)}/>}
      {showAddPicker && (
        <CompletePatrimoinePicker
          onClose={() => setShowAddPicker(false)}
          onPickAsset={(typeId) => {
            setShowAddPicker(false);
            setEditingAsset({ id: null, type: typeId, name: '', currentValue: 0, memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', updatedAt: new Date().toISOString() });
          }}
          onPickLiability={() => {
            setShowAddPicker(false);
            setEditingLia({ id: null, type: 'mortgage', name: '', initialCapital: '', remainingCapital: '', monthlyPayment: '', interestRate: '', endDate: '', memberIds: activeMemberId !== 'all' ? [activeMemberId] : [], notes: '', downPayment: '', insuranceRate: '', applicationFees: '', ownershipPct: 100, durationMonths: '', startDate: '', linkedAssetId: '' });
          }}
        />
      )}
    </div>
  );
}

function CompletePatrimoinePicker({ onClose, onPickAsset, onPickLiability }) {
  const [filter, setFilter] = useState('');
  const items = [
    ...ASSET_TYPES.map(t => ({ kind: 'asset', id: t.id, name: t.name, description: t.description, icon: t.icon, color: t.color })),
    { kind: 'liability', id: 'mortgage', name: 'Crédit / Emprunt', description: 'Crédit immo, conso, auto…', icon: CreditCard, color: '#7c2d12' },
  ];
  const filtered = items.filter(i => i.name.toLowerCase().includes(filter.toLowerCase()) || i.description.toLowerCase().includes(filter.toLowerCase()));
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Compléter mon patrimoine</h2>
          <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label>
            <span>Rechercher</span>
            <input autoFocus type="text" placeholder="Immobilier, PEA, Crypto, Crédit…" value={filter} onChange={(e) => setFilter(e.target.value)}/>
          </label>
          <div className="patrimoine-picker-grid">
            {filtered.map((it, i) => {
              const Icon = it.icon;
              const onClick = () => it.kind === 'asset' ? onPickAsset(it.id) : onPickLiability();
              return (
                <button key={i} className="patrimoine-picker-card" onClick={onClick}>
                  <div className="ppc-icon" style={{ background: it.color + '22', color: it.color }}><Icon size={20}/></div>
                  <div className="ppc-text">
                    <div className="ppc-name">{it.name}</div>
                    <div className="ppc-desc">{it.description}</div>
                  </div>
                </button>
              );
            })}
            {filtered.length === 0 && <p style={{ color: 'var(--text-tertiary)', textAlign: 'center', padding: 24 }}>Aucun résultat.</p>}
          </div>
        </div>
      </div>
    </div>
  );
}

function AssetEditor({ asset, members, liabilities = [], onSave, onCancel }) {
  // Real-estate gets the multi-step wizard; the rest stays the lighter form.
  if (asset.type === 'real_estate') {
    return <RealEstateEditor asset={asset} members={members} liabilities={liabilities} onSave={onSave} onCancel={onCancel}/>;
  }
  return <SimpleAssetEditor asset={asset} members={members} onSave={onSave} onCancel={onCancel}/>;
}

function SimpleAssetEditor({ asset, members, onSave, onCancel }) {
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
          <div className="field-row">
            <label><span>Prix de revient (€) <span className="hint">optionnel</span></span>
              <input type="number" value={draft.purchasePrice ?? ''} onChange={(e) => setDraft({ ...draft, purchasePrice: e.target.value })} step="any" placeholder="ex: 12 500"/>
            </label>
            <label><span>Date d'acquisition <span className="hint">optionnel</span></span>
              <input type="date" value={draft.purchaseDate || ''} onChange={(e) => setDraft({ ...draft, purchaseDate: e.target.value })}/>
            </label>
          </div>
          <div className="field-help">Si renseigné, l'app calcule automatiquement la plus-value latente (€ et %) sur la fiche du patrimoine.</div>
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

// ============================================================================
// REAL ESTATE WIZARD — 4 steps: Description / Caractéristiques / Détails / Emprunts
// ============================================================================
const RE_SUBTYPES = [
  { key: 'rp',         label: 'Résidence principale' },
  { key: 'secondaire', label: 'Résidence secondaire' },
  { key: 'locative',   label: 'Investissement locatif' },
  { key: 'scpi',       label: 'SCPI' },
  { key: 'other',      label: 'Autre' },
];

const RE_STEPS = [
  { key: 'desc',  label: 'Description' },
  { key: 'specs', label: 'Caractéristiques' },
  { key: 'detail', label: 'Détails' },
  { key: 'loans', label: 'Emprunts rattachés' },
];

function RealEstateEditor({ asset, members, liabilities, onSave, onCancel }) {
  const [draft, setDraft] = useState({
    ...asset,
    subtype: asset.subtype || 'rp',
    address: asset.address || '',
    purchasePrice: asset.purchasePrice ?? '',
    surfaceM2: asset.surfaceM2 ?? '',
    notaryFees: asset.notaryFees ?? '',
    agencyFees: asset.agencyFees ?? '',
    worksFees: asset.worksFees ?? '',
    furnitureFees: asset.furnitureFees ?? '',
    purchaseDate: asset.purchaseDate || '',
    constructionYear: asset.constructionYear ?? '',
    ownershipPct: asset.ownershipPct ?? 100,
    currentValue: asset.currentValue ?? '',
  });
  const [stepIdx, setStepIdx] = useState(0);
  const step = RE_STEPS[stepIdx].key;
  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const toggleMember = (mid) => {
    const ids = draft.memberIds || [];
    set('memberIds', ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid]);
  };
  const linkedLoans = (liabilities || []).filter(l => l.linkedAssetId === asset.id);

  const canSave = draft.name && (draft.memberIds || []).length > 0;
  const submit = () => {
    if (!canSave) { alert('Renseigne un nom et au moins un propriétaire.'); return; }
    onSave({ ...draft, updatedAt: new Date().toISOString() });
  };

  // Auto-suggest current value when not set (purchase + works + furniture)
  const suggestedValue = (() => {
    const p = parseFloat(draft.purchasePrice) || 0;
    const w = parseFloat(draft.worksFees) || 0;
    const f = parseFloat(draft.furnitureFees) || 0;
    return p + w + f;
  })();

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal--wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{asset.id ? 'Modifier mon immobilier' : 'Ajouter mon immobilier'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="wizard-body">
          <nav className="wizard-steps">
            {RE_STEPS.map((s, i) => (
              <button
                key={s.key}
                className={`wizard-step ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}
                onClick={() => setStepIdx(i)}
              >
                <span className="wizard-step-num">{i + 1}</span>
                <span className="wizard-step-label">{s.label}</span>
              </button>
            ))}
          </nav>
          <div className="wizard-pane">
            {step === 'desc' && (
              <>
                <label><span>Nom du bien</span>
                  <input autoFocus value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Appartement Paris 11e"/>
                </label>
                <label><span>Adresse <em>optionnel</em></span>
                  <input value={draft.address} onChange={(e) => set('address', e.target.value)} placeholder="58bis Cité Durmar, 75011 Paris"/>
                </label>
                <label><span>Catégorie</span>
                  <select value={draft.subtype} onChange={(e) => set('subtype', e.target.value)}>
                    {RE_SUBTYPES.map(s => <option key={s.key} value={s.key}>{s.label}</option>)}
                  </select>
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
              </>
            )}

            {step === 'specs' && (
              <>
                <label><span>Prix d'achat hors frais (€)</span>
                  <input type="number" value={draft.purchasePrice} onChange={(e) => set('purchasePrice', e.target.value)} step="any"/>
                </label>
                <div className="field-row">
                  <label><span>Surface (m²)</span>
                    <input type="number" value={draft.surfaceM2} onChange={(e) => set('surfaceM2', e.target.value)} step="0.1"/>
                  </label>
                  <label><span>Détention (%)</span>
                    <input type="number" min={0} max={100} value={draft.ownershipPct} onChange={(e) => set('ownershipPct', e.target.value)} step="0.1"/>
                  </label>
                </div>
                <div className="field-row">
                  <label><span>Frais d'agence (€) <em>optionnel</em></span>
                    <input type="number" value={draft.agencyFees} onChange={(e) => set('agencyFees', e.target.value)} step="any"/>
                  </label>
                  <label><span>Frais de notaire (€) <em>optionnel</em></span>
                    <input type="number" value={draft.notaryFees} onChange={(e) => set('notaryFees', e.target.value)} step="any"/>
                  </label>
                </div>
                <div className="field-row">
                  <label><span>Frais de travaux (€) <em>optionnel</em></span>
                    <input type="number" value={draft.worksFees} onChange={(e) => set('worksFees', e.target.value)} step="any"/>
                  </label>
                  <label><span>Frais d'ameublement (€) <em>optionnel</em></span>
                    <input type="number" value={draft.furnitureFees} onChange={(e) => set('furnitureFees', e.target.value)} step="any"/>
                  </label>
                </div>
                <div className="field-row">
                  <label><span>Date d'achat <em>optionnel</em></span>
                    <input type="date" value={draft.purchaseDate || ''} onChange={(e) => set('purchaseDate', e.target.value)}/>
                  </label>
                  <label><span>Année de construction <em>optionnel</em></span>
                    <input type="number" value={draft.constructionYear} onChange={(e) => set('constructionYear', e.target.value)} placeholder="1985"/>
                  </label>
                </div>
              </>
            )}

            {step === 'detail' && (
              <>
                <label><span>Valeur actuelle (€)</span>
                  <input type="number" value={draft.currentValue} onChange={(e) => set('currentValue', e.target.value)} step="any"/>
                </label>
                {suggestedValue > 0 && (!draft.currentValue || parseFloat(draft.currentValue) === 0) && (
                  <button type="button" className="secondary-btn" style={{ alignSelf: 'flex-start' }} onClick={() => set('currentValue', String(suggestedValue))}>
                    Estimer à {Math.round(suggestedValue).toLocaleString('fr-FR')} € (achat + travaux + ameublement)
                  </button>
                )}
                <label><span>Notes <em>optionnel</em></span>
                  <textarea rows={3} value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)} placeholder="DPE, locataire, copro…"/>
                </label>
              </>
            )}

            {step === 'loans' && (
              <>
                <p style={{ color: 'var(--text-secondary)', fontSize: 13 }}>
                  Les emprunts rattachés à ce bien apparaissent ici. Pour lier un nouveau crédit, ajoute-le depuis Patrimoine → Emprunts et sélectionne ce bien dans l'étape "Actifs liés" du wizard.
                </p>
                {linkedLoans.length === 0 ? (
                  <div className="empty-mini" style={{ padding: '32px 0' }}>
                    <CreditCard size={24}/>
                    <p>Aucun emprunt rattaché à ce bien.</p>
                  </div>
                ) : (
                  <div className="liability-list">
                    {linkedLoans.map(l => (
                      <div key={l.id} className="liability-card-v2" style={{ cursor: 'default' }}>
                        <div className="lia-header">
                          <div className="lia-icon" style={{ background: '#7c2d1222', color: '#7c2d12' }}><Home size={14}/></div>
                          <div className="lia-name-block">
                            <span className="lia-name">{l.name}</span>
                            <span className="lia-type">Restant dû : {Math.round(l.remainingCapital || 0).toLocaleString('fr-FR')} €</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
        <div className="modal-footer wizard-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <div style={{ flex: 1 }}/>
          {stepIdx > 0 && <button className="secondary-btn" onClick={() => setStepIdx(stepIdx - 1)}><ChevronLeft size={14}/> Retour</button>}
          {stepIdx < RE_STEPS.length - 1 ? (
            <button className="primary-btn" onClick={() => setStepIdx(stepIdx + 1)}>Suivant <ChevronRight size={14}/></button>
          ) : (
            <button className="primary-btn" onClick={submit} disabled={!canSave}><Check size={14}/> Enregistrer</button>
          )}
        </div>
      </div>
    </div>
  );
}


// ============================================================================
// LIABILITY WIZARD (5 steps — inspired by Finary)
// ============================================================================
const LIABILITY_STEPS = [
  { key: 'main',    label: 'Infos principales' },
  { key: 'specs',   label: 'Caractéristiques' },
  { key: 'duration',label: 'Durée' },
  { key: 'fees',    label: 'Frais & détention' },
  { key: 'linked',  label: 'Actifs liés' },
];

function LiabilityEditor({ liability, members, assets = [], onSave, onCancel }) {
  const [draft, setDraft] = useState({
    ...liability,
    initialCapital: liability.initialCapital ?? '',
    remainingCapital: liability.remainingCapital ?? '',
    monthlyPayment: liability.monthlyPayment ?? '',
    interestRate: liability.interestRate ?? '',
    downPayment: liability.downPayment ?? '',
    insuranceRate: liability.insuranceRate ?? '',
    applicationFees: liability.applicationFees ?? '',
    ownershipPct: liability.ownershipPct ?? 100,
    durationMonths: liability.durationMonths ?? '',
    startDate: liability.startDate || '',
    linkedAssetId: liability.linkedAssetId || '',
  });
  const [stepIdx, setStepIdx] = useState(0);
  const step = LIABILITY_STEPS[stepIdx].key;

  const set = (k, v) => setDraft({ ...draft, [k]: v });
  const toggleMember = (mid) => {
    const ids = draft.memberIds || [];
    set('memberIds', ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid]);
  };

  const canSave = draft.name && (draft.memberIds || []).length > 0;
  const submit = () => {
    if (!canSave) { alert('Renseigne au moins un nom et un emprunteur.'); return; }
    onSave(draft);
  };

  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal modal--wizard" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{liability.id ? 'Modifier l\'emprunt' : 'Ajouter un emprunt'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="wizard-body">
          <nav className="wizard-steps">
            {LIABILITY_STEPS.map((s, i) => (
              <button
                key={s.key}
                className={`wizard-step ${i === stepIdx ? 'active' : ''} ${i < stepIdx ? 'done' : ''}`}
                onClick={() => setStepIdx(i)}
              >
                <span className="wizard-step-num">{i + 1}</span>
                <span className="wizard-step-label">{s.label}</span>
              </button>
            ))}
          </nav>
          <div className="wizard-pane">
            {step === 'main' && (
              <>
                <label><span>Nom</span>
                  <input value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Emprunt RP, Auto, …" autoFocus/>
                </label>
                <label><span>Type</span>
                  <select value={draft.type} onChange={(e) => set('type', e.target.value)}>
                    {LIABILITY_TYPES.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </label>
                <div className="field-row">
                  <label><span>Montant emprunté (€)</span>
                    <input type="number" value={draft.initialCapital} onChange={(e) => set('initialCapital', e.target.value)} step="any"/>
                  </label>
                  <label><span>Apport (€) <em>optionnel</em></span>
                    <input type="number" value={draft.downPayment} onChange={(e) => set('downPayment', e.target.value)} step="any"/>
                  </label>
                </div>
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
              </>
            )}

            {step === 'specs' && (
              <>
                <div className="field-row">
                  <label><span>Mensualité totale (€)</span>
                    <input type="number" value={draft.monthlyPayment} onChange={(e) => set('monthlyPayment', e.target.value)} step="any"/>
                  </label>
                  <label><span>Taux d'intérêt (%)</span>
                    <input type="number" value={draft.interestRate} onChange={(e) => set('interestRate', e.target.value)} step="0.01"/>
                  </label>
                </div>
                <label><span>Taux d'assurance (%) <em>optionnel</em></span>
                  <input type="number" value={draft.insuranceRate} onChange={(e) => set('insuranceRate', e.target.value)} step="0.01"/>
                </label>
                <label><span>Capital restant dû (€)</span>
                  <input type="number" value={draft.remainingCapital} onChange={(e) => set('remainingCapital', e.target.value)} step="any"/>
                </label>
              </>
            )}

            {step === 'duration' && (
              <>
                <div className="field-row">
                  <label><span>Date de première échéance</span>
                    <input type="date" value={draft.startDate || ''} onChange={(e) => set('startDate', e.target.value)}/>
                  </label>
                  <label><span>Durée totale (mois)</span>
                    <input type="number" value={draft.durationMonths} onChange={(e) => set('durationMonths', e.target.value)} placeholder="240"/>
                  </label>
                </div>
                <label><span>Date de fin</span>
                  <input type="date" value={draft.endDate || ''} onChange={(e) => set('endDate', e.target.value)}/>
                </label>
                <div className="settings-info">
                  <Lightbulb size={14}/>
                  <span>Tu peux soit saisir la durée totale, soit la date de fin. Wealthly utilise les deux pour calculer le calendrier d'amortissement.</span>
                </div>
              </>
            )}

            {step === 'fees' && (
              <>
                <div className="field-row">
                  <label><span>Frais de dossier (€) <em>optionnel</em></span>
                    <input type="number" value={draft.applicationFees} onChange={(e) => set('applicationFees', e.target.value)} step="any"/>
                  </label>
                  <label><span>Détention de l'emprunt (%) <em>optionnel</em></span>
                    <input type="number" value={draft.ownershipPct} onChange={(e) => set('ownershipPct', e.target.value)} min="0" max="100" step="0.1"/>
                  </label>
                </div>
                <label><span>Notes</span>
                  <textarea rows={3} value={draft.notes || ''} onChange={(e) => set('notes', e.target.value)}/>
                </label>
              </>
            )}

            {step === 'linked' && (
              <>
                <label><span>Actif lié <em>optionnel</em></span>
                  <select value={draft.linkedAssetId || ''} onChange={(e) => set('linkedAssetId', e.target.value)}>
                    <option value="">— Aucun —</option>
                    {assets.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                  </select>
                </label>
                <div className="settings-info">
                  <Lightbulb size={14}/>
                  <span>Lier un emprunt à un actif (ex: ton crédit immobilier à ta résidence principale) permet à Wealthly de croiser les deux dans tes vues Patrimoine.</span>
                </div>
              </>
            )}
          </div>
        </div>
        <div className="modal-footer wizard-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <div style={{ flex: 1 }}/>
          {stepIdx > 0 && <button className="secondary-btn" onClick={() => setStepIdx(stepIdx - 1)}><ChevronLeft size={14}/> Retour</button>}
          {stepIdx < LIABILITY_STEPS.length - 1 ? (
            <button className="primary-btn" onClick={() => setStepIdx(stepIdx + 1)}>Suivant <ChevronRight size={14}/></button>
          ) : (
            <button className="primary-btn" onClick={submit} disabled={!canSave}><Check size={14}/> Enregistrer</button>
          )}
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// LOAN AMORTIZATION + DETAIL VIEW
// ============================================================================

/**
 * Compute a fixed-rate annuity amortization schedule.
 *
 * Returns one row per month: { idx, date, capital, interest, insurance,
 * payment, remaining }. The last row's `remaining` should be ~0.
 *
 * Inputs:
 *  - principal   : initial capital (€)
 *  - annualRate  : annual interest rate in % (e.g. 1.25 → 1.25%)
 *  - durationM   : total duration in months
 *  - insuranceRate : annual insurance rate in % of initial principal
 *  - startDate   : ISO date string for the first payment (used to label rows)
 *  - paymentOverride : optional fixed monthly payment (capital + interest);
 *                       used if provided so the UI can match the value the
 *                       user actually pays — otherwise computed from formula.
 */
function buildAmortization({ principal, annualRate, durationM, insuranceRate, startDate, paymentOverride }) {
  const P = parseFloat(principal) || 0;
  const n = parseInt(durationM, 10) || 0;
  const r = (parseFloat(annualRate) || 0) / 100 / 12;
  const ins = ((parseFloat(insuranceRate) || 0) / 100 / 12) * P;
  if (P <= 0 || n <= 0) return [];

  const monthlyKap = paymentOverride
    ? Math.max(0, parseFloat(paymentOverride) - ins)
    : (r > 0 ? P * (r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1) : P / n);

  let remaining = P;
  const start = startDate ? new Date(startDate) : new Date();
  const rows = [];
  for (let i = 0; i < n; i++) {
    const interest = remaining * r;
    let capital = monthlyKap - interest;
    if (capital > remaining) capital = remaining;
    remaining = Math.max(0, remaining - capital);
    const d = new Date(start.getFullYear(), start.getMonth() + i, start.getDate());
    rows.push({
      idx: i + 1,
      date: d.toISOString().slice(0, 10),
      capital,
      interest,
      insurance: ins,
      payment: capital + interest + ins,
      remaining,
    });
  }
  return rows;
}

function LiabilityDetail({ liability, assets, members, memberShare, fmt, onEdit, onClose }) {
  const l = liability;
  const schedule = useMemo(() => buildAmortization({
    principal: l.initialCapital,
    annualRate: l.interestRate,
    durationM: l.durationMonths,
    insuranceRate: l.insuranceRate,
    startDate: l.startDate,
    paymentOverride: l.monthlyPayment,
  }), [l]);

  const today = new Date().toISOString().slice(0, 10);
  const paidRows = schedule.filter(r => r.date <= today);
  const remainingRows = schedule.filter(r => r.date > today);
  const totalCost = schedule.reduce((s, r) => s + r.payment, 0) + (parseFloat(l.applicationFees) || 0);
  const totalCapitalPaid = paidRows.reduce((s, r) => s + r.capital, 0);
  const totalInterestPaid = paidRows.reduce((s, r) => s + r.interest, 0);
  const totalInsurancePaid = paidRows.reduce((s, r) => s + r.insurance, 0);
  const totalPaid = totalCapitalPaid + totalInterestPaid + totalInsurancePaid;
  const totalRemaining = remainingRows.reduce((s, r) => s + r.payment, 0);
  const computedRemaining = remainingRows.length > 0 ? remainingRows[0].remaining + remainingRows[0].capital : 0;
  const remainingCapital = parseFloat(l.remainingCapital) > 0 ? parseFloat(l.remainingCapital) : computedRemaining;
  const principal = parseFloat(l.initialCapital) || 0;
  const pctRepaid = principal > 0 ? Math.min(100, ((principal - remainingCapital) / principal) * 100) : 0;
  const linkedAsset = l.linkedAssetId ? assets.find(a => a.id === l.linkedAssetId) : null;
  const owners = (l.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');

  // Mensualité breakdown — on prend la première échéance non payée si dispo,
  // sinon la première
  const ref = remainingRows[0] || schedule[0] || null;

  const chartData = schedule.map(r => ({
    date: r.date,
    remaining: Math.round(r.remaining),
    paid: Math.round(principal - r.remaining),
  }));

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--detail" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <ChevronLeft size={18} style={{ cursor: 'pointer' }} onClick={onClose}/>
            <h2>{l.name}</h2>
          </div>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="secondary-btn" onClick={onEdit}><Edit3 size={13}/> Modifier</button>
            <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
          </div>
        </div>

        <div className="loan-detail-body">
          <div className="loan-detail-top">
            <div className="loan-amort-block">
              <div className="loan-amort-period">
                {l.startDate ? formatDate(l.startDate, { format: 'short' }) : '—'}
                {' → '}
                {l.endDate ? formatDate(l.endDate, { format: 'short' }) : '—'}
              </div>
              <div className="loan-amort-value">{fmt(remainingCapital)}</div>
              <div className="loan-amort-meta">capital restant dû</div>
              {schedule.length > 0 ? (
                <ResponsiveContainer width="100%" height={220}>
                  <AreaChart data={chartData} margin={{ left: 0, right: 8, top: 10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="amort-fill" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.4}/>
                        <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.02}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-light)" vertical={false}/>
                    <XAxis dataKey="date" tickFormatter={(d) => d.slice(0, 4)} stroke="var(--text-tertiary)" fontSize={11} interval={Math.max(0, Math.floor(schedule.length / 8))}/>
                    <YAxis tickFormatter={(v) => formatCurrency(v, { compact: true })} stroke="var(--text-tertiary)" fontSize={11}/>
                    <Tooltip
                      formatter={(v) => fmt(v)}
                      labelFormatter={(d) => formatDate(d, { format: 'monthYear' })}
                      contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                    />
                    <Area type="monotone" dataKey="remaining" name="Capital restant" stroke="var(--primary)" strokeWidth={2} fill="url(#amort-fill)"/>
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-mini">
                  <BarChart3 size={20}/>
                  <p>Renseigne le capital, le taux et la durée pour voir la courbe d'amortissement.</p>
                </div>
              )}
            </div>

            <aside className="loan-monthly-card">
              <div className="loan-monthly-label">MENSUALITÉ</div>
              <div className="loan-monthly-value">{fmt(parseFloat(l.monthlyPayment) || (ref?.payment ?? 0))}</div>
              <div className="loan-monthly-sub">par mois</div>
              {ref && (
                <div className="loan-monthly-breakdown">
                  <div><span className="dot dot-cap"/>Capital</div><div>{fmt(ref.capital)}</div>
                  <div><span className="dot dot-int"/>Intérêts</div><div>{fmt(ref.interest)}</div>
                  <div><span className="dot dot-ins"/>Assurance</div><div>{fmt(ref.insurance)}</div>
                </div>
              )}
              <div className="loan-monthly-stats">
                <div><span>Échéances payées</span><strong>{paidRows.length}</strong></div>
                <div><span>Échéances restantes</span><strong>{remainingRows.length}</strong></div>
                <div><span>Date de fin</span><strong>{l.endDate ? formatDate(l.endDate, { format: 'monthYear' }) : '—'}</strong></div>
              </div>
              <div className="loan-pct-pill">Tu as remboursé {pctRepaid.toFixed(0)} % du capital du prêt</div>
            </aside>
          </div>

          <h3 className="loan-section-title">Synthèse</h3>
          <div className="loan-summary-grid">
            <div className="loan-summary-card">
              <div className="loan-summary-label">COÛT TOTAL DE L'EMPRUNT</div>
              <div className="loan-summary-value">{fmt(totalCost)}</div>
              <div className="loan-summary-rows">
                <div><span>Capital</span><span>{fmt(principal)}</span></div>
                <div><span>Intérêts et assurance</span><span>{fmt(totalCost - principal - (parseFloat(l.applicationFees) || 0))}</span></div>
                <div><span>Frais de dossier</span><span>{l.applicationFees ? fmt(parseFloat(l.applicationFees)) : '—'}</span></div>
              </div>
            </div>

            <div className="loan-summary-card">
              <div className="loan-summary-label">TOTAL REMBOURSÉ</div>
              <div className="loan-summary-value">{fmt(totalPaid)}</div>
              <div className="loan-summary-rows">
                <div><span>Capital</span><span>{fmt(totalCapitalPaid)}</span></div>
                <div><span>Intérêts</span><span>{fmt(totalInterestPaid)}</span></div>
                <div><span>Assurance</span><span>{fmt(totalInsurancePaid)}</span></div>
              </div>
            </div>

            <div className="loan-summary-card">
              <div className="loan-summary-label">CAPITAL RESTANT DÛ</div>
              <div className="loan-summary-value">{fmt(remainingCapital)}</div>
              <div className="loan-summary-rows">
                <div><span>Reste à rembourser</span><span>{fmt(totalRemaining)}</span></div>
                <div><span>Reste à rembourser (%)</span><span>{(100 - pctRepaid).toFixed(0)} %</span></div>
              </div>
            </div>
          </div>

          {(linkedAsset || owners) && (
            <div className="loan-meta-row">
              {linkedAsset && (
                <div className="loan-meta-pill"><Home size={14}/> Lié à <strong>{linkedAsset.name}</strong></div>
              )}
              {owners && (
                <div className="loan-meta-pill"><Users size={14}/> {owners}</div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
