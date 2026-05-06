// ============================================================================
// Transactions — searchable + multi-filterable + sortable list
//
// Filter panel is collapsible. The compact bar shows search + a Filtres button
// (with active-filter count badge) + reset; expanded panel adds multi-select
// catégories / comptes / membres, date range, amount range, and tx type.
// ============================================================================
import { useState, useMemo, useRef, useEffect } from 'react';
import { Search, ArrowUpDown, Repeat, Trash2, Filter, X, RotateCcw } from 'lucide-react';
import { formatDate } from '../utils.js';

const EMPTY_FILTERS = {
  cats: [],          // string[] — empty means "all"
  accs: [],          // string[]
  members: [],       // string[]
  dateFrom: '',      // YYYY-MM-DD
  dateTo: '',
  amountMin: '',     // string for input control, parsed at filter time
  amountMax: '',
  type: 'all',       // all | income | expense
};

export function Transactions({ transactions, accounts, categories, members = [], recurringIds, toggleRecurring, updateCategory, deleteTransaction, fmt }) {
  const [search, setSearch] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [showPanel, setShowPanel] = useState(false);
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingTx, setEditingTx] = useState(null);
  const panelRef = useRef(null);

  // Close the filter panel on outside click.
  useEffect(() => {
    if (!showPanel) return;
    const onClick = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setShowPanel(false);
    };
    window.addEventListener('mousedown', onClick);
    return () => window.removeEventListener('mousedown', onClick);
  }, [showPanel]);

  // Index account → its member ids, for the per-tx member filter.
  const accountMembers = useMemo(() => {
    const m = {};
    accounts.forEach(a => { m[a.id] = a.memberIds || []; });
    return m;
  }, [accounts]);

  // Per-category transaction counts (shown next to each checkbox in the panel).
  const catCounts = useMemo(() => {
    const c = {};
    transactions.forEach(t => { c[t.categoryId || 'uncategorized'] = (c[t.categoryId || 'uncategorized'] || 0) + 1; });
    return c;
  }, [transactions]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    const min = filters.amountMin === '' ? null : parseFloat(filters.amountMin);
    const max = filters.amountMax === '' ? null : parseFloat(filters.amountMax);
    return transactions
      .filter(t => {
        if (q && !(t.label || '').toLowerCase().includes(q)) return false;
        if (filters.cats.length > 0 && !filters.cats.includes(t.categoryId || 'uncategorized')) return false;
        if (filters.accs.length > 0 && !filters.accs.includes(t.accountId)) return false;
        if (filters.members.length > 0) {
          const owners = accountMembers[t.accountId] || [];
          if (!filters.members.some(m => owners.includes(m))) return false;
        }
        if (filters.dateFrom && t.date < filters.dateFrom) return false;
        if (filters.dateTo && t.date > filters.dateTo) return false;
        if (min != null && Math.abs(t.amount) < min) return false;
        if (max != null && Math.abs(t.amount) > max) return false;
        if (filters.type === 'income' && t.amount < 0) return false;
        if (filters.type === 'expense' && t.amount >= 0) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortKey === 'amount') cmp = a.amount - b.amount;
        else if (sortKey === 'label') cmp = (a.label || '').localeCompare(b.label || '');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [transactions, search, filters, sortKey, sortDir, accountMembers]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  const toggleInList = (key, value) => {
    setFilters(f => ({
      ...f,
      [key]: f[key].includes(value) ? f[key].filter(v => v !== value) : [...f[key], value],
    }));
  };

  const setField = (key, value) => setFilters(f => ({ ...f, [key]: value }));
  const resetFilters = () => { setFilters(EMPTY_FILTERS); setSearch(''); };

  // Active filter count for the badge.
  const activeCount =
    filters.cats.length +
    filters.accs.length +
    filters.members.length +
    (filters.dateFrom ? 1 : 0) +
    (filters.dateTo ? 1 : 0) +
    (filters.amountMin !== '' ? 1 : 0) +
    (filters.amountMax !== '' ? 1 : 0) +
    (filters.type !== 'all' ? 1 : 0);

  const expenseCats = categories.filter(c => c.type === 'expense');
  const incomeCats = categories.filter(c => c.type === 'income');

  return (
    <div className="transactions-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Toutes vos opérations. Cliquez une catégorie pour la modifier.</p>
        </div>
      </div>

      <div className="filters-bar" ref={panelRef}>
        <div className="search-box">
          <Search size={16}/>
          <input placeholder="Rechercher dans les libellés…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>

        <button
          className={`tx-filter-btn ${activeCount > 0 ? 'has-active' : ''}`}
          onClick={() => setShowPanel(s => !s)}
          aria-expanded={showPanel}
        >
          <Filter size={14}/>
          <span>Filtres</span>
          {activeCount > 0 && <span className="tx-filter-count">{activeCount}</span>}
        </button>

        {(activeCount > 0 || search) && (
          <button className="tx-filter-reset" onClick={resetFilters} title="Réinitialiser tous les filtres">
            <RotateCcw size={13}/> Réinitialiser
          </button>
        )}

        <span className="result-count">{filtered.length} transaction{filtered.length > 1 ? 's' : ''}</span>

        {showPanel && (
          <div className="tx-filter-panel">
            <div className="tx-filter-panel-header">
              <span>Filtres avancés</span>
              <button className="icon-btn-sm" onClick={() => setShowPanel(false)} aria-label="Fermer"><X size={14}/></button>
            </div>

            <div className="tx-filter-section">
              <div className="tx-filter-label">Type</div>
              <div className="tx-filter-radio-row">
                {[
                  { v: 'all',     l: 'Tout' },
                  { v: 'income',  l: 'Revenus' },
                  { v: 'expense', l: 'Dépenses' },
                ].map(o => (
                  <button
                    key={o.v}
                    className={`tx-filter-pill ${filters.type === o.v ? 'active' : ''}`}
                    onClick={() => setField('type', o.v)}
                  >{o.l}</button>
                ))}
              </div>
            </div>

            <div className="tx-filter-section">
              <div className="tx-filter-label">Période</div>
              <div className="tx-filter-row-2">
                <input type="date" value={filters.dateFrom} onChange={(e) => setField('dateFrom', e.target.value)} aria-label="Date de début"/>
                <input type="date" value={filters.dateTo} onChange={(e) => setField('dateTo', e.target.value)} aria-label="Date de fin"/>
              </div>
            </div>

            <div className="tx-filter-section">
              <div className="tx-filter-label">Montant (€, valeur absolue)</div>
              <div className="tx-filter-row-2">
                <input type="number" placeholder="min" value={filters.amountMin} onChange={(e) => setField('amountMin', e.target.value)} min="0" step="0.01"/>
                <input type="number" placeholder="max" value={filters.amountMax} onChange={(e) => setField('amountMax', e.target.value)} min="0" step="0.01"/>
              </div>
            </div>

            {members.length > 1 && (
              <div className="tx-filter-section">
                <div className="tx-filter-label">Membre(s)</div>
                <div className="tx-filter-chips">
                  {members.map(m => (
                    <button
                      key={m.id}
                      className={`tx-filter-chip ${filters.members.includes(m.id) ? 'active' : ''}`}
                      onClick={() => toggleInList('members', m.id)}
                      style={filters.members.includes(m.id) ? { borderColor: m.color, color: m.color } : {}}
                    >
                      <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                      {m.name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {accounts.length > 0 && (
              <div className="tx-filter-section">
                <div className="tx-filter-label">Comptes</div>
                <div className="tx-filter-chips">
                  {accounts.map(a => (
                    <button
                      key={a.id}
                      className={`tx-filter-chip ${filters.accs.includes(a.id) ? 'active' : ''}`}
                      onClick={() => toggleInList('accs', a.id)}
                    >{a.name}</button>
                  ))}
                </div>
              </div>
            )}

            <div className="tx-filter-section">
              <div className="tx-filter-label">Catégories</div>
              {incomeCats.length > 0 && (
                <>
                  <div className="tx-filter-sublabel">Revenus</div>
                  <div className="tx-filter-cat-grid">
                    {incomeCats.map(c => (
                      <label key={c.id} className={`tx-filter-cat ${filters.cats.includes(c.id) ? 'active' : ''}`}>
                        <input type="checkbox" checked={filters.cats.includes(c.id)} onChange={() => toggleInList('cats', c.id)}/>
                        <span className="tx-filter-cat-icon">{c.icon}</span>
                        <span className="tx-filter-cat-name">{c.name}</span>
                        <span className="tx-filter-cat-count">{catCounts[c.id] || 0}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
              {expenseCats.length > 0 && (
                <>
                  <div className="tx-filter-sublabel">Dépenses</div>
                  <div className="tx-filter-cat-grid">
                    {expenseCats.map(c => (
                      <label key={c.id} className={`tx-filter-cat ${filters.cats.includes(c.id) ? 'active' : ''}`}>
                        <input type="checkbox" checked={filters.cats.includes(c.id)} onChange={() => toggleInList('cats', c.id)}/>
                        <span className="tx-filter-cat-icon">{c.icon}</span>
                        <span className="tx-filter-cat-name">{c.name}</span>
                        <span className="tx-filter-cat-count">{catCounts[c.id] || 0}</span>
                      </label>
                    ))}
                  </div>
                </>
              )}
            </div>

            <div className="tx-filter-panel-footer">
              <button className="secondary-btn" onClick={resetFilters}>
                <RotateCcw size={13}/> Réinitialiser
              </button>
              <button className="primary-btn" onClick={() => setShowPanel(false)}>
                Voir {filtered.length} résultat{filtered.length > 1 ? 's' : ''}
              </button>
            </div>
          </div>
        )}
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
