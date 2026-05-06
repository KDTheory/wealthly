// ============================================================================
// AccountDrawer — slide-in panel from the right with one account's detail
//
// Shows the latest balance, a 3-month sparkline computed on the fly from the
// transaction stream (running balance backwards from current = "balance now"),
// the 10 most recent transactions, and a CTA to jump to the full Transactions
// view with the account already filtered in.
// ============================================================================
import { useEffect, useMemo } from 'react';
import { X, ChevronRight, Wallet, Users } from 'lucide-react';
import { Area, AreaChart, ResponsiveContainer, Tooltip } from 'recharts';
import { formatDate, monthKey } from '../utils.js';

export function AccountDrawer({ account, transactions, members = [], accountBalance, fmt, onClose, onSeeAll }) {
  // ESC closes the drawer.
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  const owners = useMemo(() => {
    return (account.memberIds || [])
      .map((id) => members.find((m) => m.id === id))
      .filter(Boolean);
  }, [account.memberIds, members]);

  // Transactions on this account, newest first.
  const accountTx = useMemo(() => {
    return transactions
      .filter((t) => t.accountId === account.id)
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [transactions, account.id]);

  const recentTx = accountTx.slice(0, 10);

  // 3-month sparkline of the balance — start from the current balance and
  // unwind backwards by subtracting each transaction. Bucket by day so the
  // chart renders smoothly without too many points.
  const sparkData = useMemo(() => {
    if (!accountBalance && accountBalance !== 0) return [];
    const today = new Date();
    const cutoff = new Date(today.getFullYear(), today.getMonth() - 3, today.getDate());
    const cutoffStr = cutoff.toISOString().slice(0, 10);
    const inWindow = accountTx.filter((t) => t.date >= cutoffStr);

    // Walk backwards in chronological order: we know today's balance, and each
    // transaction in the past changes the prior balance by -tx.amount.
    // Build forward in time from a starting balance = current - sum(future
    // transactions) — but since we filter to the window we can just start
    // from current and walk backwards through inWindow (oldest first, balance
    // before each tx).
    const ordered = [...inWindow].sort((a, b) => a.date.localeCompare(b.date));
    let running = accountBalance;
    // First subtract every tx in the window from current to get balance at the
    // start of the window.
    let startBalance = accountBalance;
    ordered.forEach((t) => { startBalance -= (t.amount || 0); });
    // Now walk forward, applying each tx, sampling per day.
    const points = [{ date: cutoffStr, balance: startBalance }];
    let bal = startBalance;
    let lastDate = cutoffStr;
    ordered.forEach((t) => {
      bal += (t.amount || 0);
      if (t.date !== lastDate) {
        points.push({ date: t.date, balance: bal });
        lastDate = t.date;
      } else {
        points[points.length - 1] = { date: t.date, balance: bal };
      }
    });
    points.push({ date: today.toISOString().slice(0, 10), balance: running });
    return points;
  }, [accountTx, accountBalance]);

  const isJoint = (account.memberIds || []).length > 1;
  const ownerLabel = owners.map((o) => o.name).join(' & ');
  const monthsRecorded = new Set(accountTx.map((t) => monthKey(t.date))).size;

  return (
    <>
      <div className="drawer-backdrop" onClick={onClose} aria-hidden="true"/>
      <aside className="drawer drawer-right" role="dialog" aria-label={`Détail du compte ${account.name}`}>
        <header className="drawer-header">
          <div className="drawer-header-icon">
            {isJoint ? <Users size={18}/> : <Wallet size={18}/>}
          </div>
          <div className="drawer-header-text">
            <div className="drawer-title">{account.name}</div>
            <div className="drawer-subtitle">
              {account.bank || 'Compte'}
              {ownerLabel ? ` · ${ownerLabel}` : ''}
              {isJoint ? ' · joint' : ''}
            </div>
          </div>
          <button className="icon-btn-sm" onClick={onClose} aria-label="Fermer"><X size={16}/></button>
        </header>

        <div className="drawer-body">
          <section className="drawer-balance">
            <div className="drawer-balance-label">Solde actuel</div>
            <div className={`drawer-balance-value w-num ${accountBalance < 0 ? 'negative' : ''}`}>
              {fmt(accountBalance || 0)}
            </div>
            <div className="drawer-balance-meta">
              {accountTx.length} transaction{accountTx.length > 1 ? 's' : ''} · {monthsRecorded} mois d'historique
            </div>
          </section>

          {sparkData.length >= 2 && (
            <section className="drawer-spark">
              <div className="drawer-section-label">Solde sur 3 mois</div>
              <ResponsiveContainer width="100%" height={88}>
                <AreaChart data={sparkData} margin={{ top: 4, right: 4, left: 4, bottom: 4 }}>
                  <defs>
                    <linearGradient id="drawer-spark-grad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="var(--color-w-accent)" stopOpacity={0.32}/>
                      <stop offset="100%" stopColor="var(--color-w-accent)" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <Area type="monotone" dataKey="balance" stroke="var(--color-w-accent)" strokeWidth={1.5} fill="url(#drawer-spark-grad)"/>
                  <Tooltip
                    contentStyle={{ background: 'var(--bg-card)', border: '1px solid var(--border-strong)', borderRadius: 8, fontSize: 12 }}
                    formatter={(v) => fmt(v)}
                    labelFormatter={(d) => formatDate(d, { format: 'long' })}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </section>
          )}

          <section className="drawer-tx">
            <div className="drawer-section-label">10 dernières transactions</div>
            {recentTx.length === 0 ? (
              <div className="drawer-empty">Aucune transaction enregistrée sur ce compte.</div>
            ) : (
              <ul className="drawer-tx-list">
                {recentTx.map((t) => (
                  <li key={t.id} className="drawer-tx-row">
                    <span className="drawer-tx-date w-num">{formatDate(t.date)}</span>
                    <span className="drawer-tx-label">{t.label || 'Sans libellé'}</span>
                    <span className={`drawer-tx-amount w-num ${t.amount >= 0 ? 'positive' : ''}`}>{fmt(t.amount, { sign: true })}</span>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>

        <footer className="drawer-footer">
          <button className="primary-btn" onClick={() => onSeeAll(account.id)}>
            Voir toutes les transactions <ChevronRight size={14}/>
          </button>
        </footer>
      </aside>
    </>
  );
}
