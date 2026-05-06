// ============================================================================
// Transactions — searchable + filterable + sortable list of all operations
// ============================================================================
import { useState, useMemo } from 'react';
import { Search, ArrowUpDown, Repeat, Trash2 } from 'lucide-react';
import { formatDate } from '../utils.js';

export function Transactions({ transactions, accounts, categories, recurringIds, toggleRecurring, updateCategory, deleteTransaction, fmt }) {
  const [search, setSearch] = useState('');
  const [filterCat, setFilterCat] = useState('all');
  const [filterAcc, setFilterAcc] = useState('all');
  const [sortKey, setSortKey] = useState('date');
  const [sortDir, setSortDir] = useState('desc');
  const [editingTx, setEditingTx] = useState(null);

  const filtered = useMemo(() => {
    return transactions
      .filter(t => {
        if (search && !(t.label || '').toLowerCase().includes(search.toLowerCase())) return false;
        if (filterCat !== 'all' && t.categoryId !== filterCat) return false;
        if (filterAcc !== 'all' && t.accountId !== filterAcc) return false;
        return true;
      })
      .sort((a, b) => {
        let cmp = 0;
        if (sortKey === 'date') cmp = a.date.localeCompare(b.date);
        else if (sortKey === 'amount') cmp = a.amount - b.amount;
        else if (sortKey === 'label') cmp = (a.label || '').localeCompare(b.label || '');
        return sortDir === 'asc' ? cmp : -cmp;
      });
  }, [transactions, search, filterCat, filterAcc, sortKey, sortDir]);

  const toggleSort = (key) => {
    if (sortKey === key) setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    else { setSortKey(key); setSortDir('desc'); }
  };

  return (
    <div className="transactions-view">
      <div className="page-header">
        <div>
          <h1 className="page-title">Transactions</h1>
          <p className="page-subtitle">Toutes vos opérations. Cliquez une catégorie pour la modifier.</p>
        </div>
      </div>
      <div className="filters-bar">
        <div className="search-box">
          <Search size={16}/>
          <input placeholder="Rechercher dans les libellés…" value={search} onChange={(e) => setSearch(e.target.value)}/>
        </div>
        <select value={filterCat} onChange={(e) => setFilterCat(e.target.value)}>
          <option value="all">Toutes catégories</option>
          {categories.map(c => <option key={c.id} value={c.id}>{c.icon} {c.name}</option>)}
        </select>
        <select value={filterAcc} onChange={(e) => setFilterAcc(e.target.value)}>
          <option value="all">Tous comptes</option>
          {accounts.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
        </select>
        <span className="result-count">{filtered.length} transaction{filtered.length > 1 ? 's' : ''}</span>
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
