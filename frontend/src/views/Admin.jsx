// ============================================================================
// Admin — visible only when currentUser.is_admin === true.
//
// Three panels:
//   1. KPIs row — total users, active 7d, login failures 24h, lockouts
//   2. Recent auth events table (last 100)
//   3. Users table with last login + login count
// ============================================================================
import { useEffect, useState, useMemo } from 'react';
import * as api from '../api.js';
import {
  Users, ShieldAlert, ShieldCheck, Activity, Lock, RefreshCw,
} from 'lucide-react';

const KIND_LABEL = {
  login_success: 'Connexion réussie',
  login_failure: 'Échec connexion',
  register_success: 'Inscription',
  register_failure: 'Échec inscription',
  password_reset_request: 'Demande reset',
  password_reset_success: 'Reset effectué',
  password_reset_failure: 'Échec reset',
  logout: 'Déconnexion',
};

const KIND_TONE = {
  login_success: 'success',
  register_success: 'success',
  password_reset_success: 'success',
  login_failure: 'danger',
  register_failure: 'danger',
  password_reset_failure: 'danger',
  password_reset_request: 'info',
  logout: 'muted',
};

function timeAgo(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  const diffS = Math.floor((Date.now() - d.getTime()) / 1000);
  if (diffS < 60) return `${diffS}s`;
  if (diffS < 3600) return `${Math.floor(diffS / 60)}min`;
  if (diffS < 86400) return `${Math.floor(diffS / 3600)}h`;
  if (diffS < 86400 * 7) return `${Math.floor(diffS / 86400)}j`;
  return d.toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

export function Admin() {
  const [stats, setStats] = useState(null);
  const [events, setEvents] = useState([]);
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);

  const handleToggle = async (userId, email) => {
    if (!window.confirm(`Suspendre / réactiver le compte ${email} ?`)) return;
    setActionLoading(userId);
    try {
      const updated = await api.admin.toggleUser(userId);
      setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: updated.is_active } : u));
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`⚠️ Supprimer définitivement le compte ${email} ? Cette action est IRRÉVERSIBLE.`)) return;
    if (!window.confirm(`Confirmer la suppression de ${email} ?`)) return;
    setActionLoading(userId);
    try {
      await api.admin.deleteUser(userId);
      setUsers(prev => prev.filter(u => u.id !== userId));
    } catch (err) {
      alert(`Erreur : ${err.message}`);
    } finally {
      setActionLoading(null);
    }
  };

  const reload = async () => {
    setLoading(true);
    setError(null);
    try {
      const [s, e, u] = await Promise.all([
        api.admin.stats(),
        api.admin.authEvents(100, filter || null),
        api.admin.users(),
      ]);
      setStats(s);
      setEvents(e || []);
      setUsers(u || []);
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); /* eslint-disable-next-line react-hooks/exhaustive-deps */ }, [filter]);

  const kpis = useMemo(() => stats ? [
    { label: 'Utilisateurs', value: stats.total_users, icon: <Users size={18}/>, tone: 'info' },
    { label: 'Actifs (7j)', value: stats.active_7d, icon: <Activity size={18}/>, tone: 'success' },
    { label: 'Échecs login (24h)', value: stats.failures_24h, icon: <ShieldAlert size={18}/>, tone: stats.failures_24h > 5 ? 'warn' : 'muted' },
    { label: 'Comptes bloqués', value: stats.lockouts?.length || 0, icon: <Lock size={18}/>, tone: (stats.lockouts?.length || 0) > 0 ? 'danger' : 'muted' },
  ] : [], [stats]);

  return (
    <div className="admin-view">
      <div className="subview-header">
        <div>
          <h1>Administration</h1>
          <p>Surveillance des connexions, utilisateurs et tentatives bloquées.</p>
        </div>
        <button className="secondary-btn" onClick={reload} disabled={loading}>
          <RefreshCw size={14} className={loading ? 'spin' : ''}/> Rafraîchir
        </button>
      </div>

      {error && (
        <div style={{ padding: '12px 16px', background: 'var(--danger-soft)', color: 'var(--danger)', borderRadius: 10, marginBottom: 12, fontSize: 13.5 }}>
          {error}
        </div>
      )}

      {/* KPIs */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginBottom: 16 }}>
        {kpis.map(k => {
          const palette = {
            success: { bg: 'var(--success-soft)', col: 'var(--success)' },
            info:    { bg: 'var(--primary-soft)', col: 'var(--primary-text)' },
            warn:    { bg: 'var(--warning-soft)', col: 'var(--warning)' },
            danger:  { bg: 'var(--danger-soft)', col: 'var(--danger)' },
            muted:   { bg: 'var(--bg-subtle)', col: 'var(--text-tertiary)' },
          }[k.tone];
          return (
            <div key={k.label} className="w-glass" style={{ padding: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12 }}>
              <div>
                <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>{k.label}</div>
                <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', fontVariantNumeric: 'tabular-nums' }}>{k.value}</div>
              </div>
              <div style={{ width: 44, height: 44, borderRadius: 12, display: 'grid', placeItems: 'center', background: palette.bg, color: palette.col }}>
                {k.icon}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lockouts banner */}
      {stats?.lockouts?.length > 0 && (
        <div className="w-glass" style={{ padding: 16, marginBottom: 16, borderColor: 'var(--danger)' }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--danger)', marginBottom: 6, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Lock size={14}/> {stats.lockouts.length} compte{stats.lockouts.length > 1 ? 's' : ''} actuellement bloqué{stats.lockouts.length > 1 ? 's' : ''}
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--text-secondary)' }}>
            {stats.lockouts.map(l => l.email).join(' · ')}
          </div>
          <div style={{ fontSize: 11.5, color: 'var(--text-tertiary)', marginTop: 6 }}>
            Seuil : {stats.lockout_threshold} échecs en {stats.lockout_window_minutes}min · Durée : {stats.lockout_duration_minutes}min
          </div>
        </div>
      )}

      {/* AUTH EVENTS */}
      <div className="w-glass" style={{ padding: 0, marginBottom: 16, overflow: 'hidden' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '18px 20px', borderBottom: '1px solid var(--border)', flexWrap: 'wrap', gap: 8 }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>Connexions récentes</h3>
          <select value={filter} onChange={(e) => setFilter(e.target.value)} style={{ padding: '6px 10px', fontSize: 12, background: 'var(--bg-subtle)', border: '1px solid var(--border)', borderRadius: 6, color: 'var(--text-primary)', cursor: 'pointer' }}>
            <option value="">Tous les types</option>
            <option value="login_success">Connexions réussies</option>
            <option value="login_failure">Échecs de connexion</option>
            <option value="register_success">Inscriptions</option>
            <option value="password_reset_request">Demandes de reset</option>
            <option value="logout">Déconnexions</option>
          </select>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                <th style={thStyle}>Quand</th>
                <th style={thStyle}>Type</th>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>IP</th>
                <th style={thStyle}>User-Agent</th>
                <th style={thStyle}>Détail</th>
              </tr>
            </thead>
            <tbody>
              {events.length === 0 && (
                <tr><td colSpan={6} style={{ padding: 18, textAlign: 'center', color: 'var(--text-tertiary)' }}>Aucun événement.</td></tr>
              )}
              {events.map(e => {
                const tone = KIND_TONE[e.kind] || 'muted';
                const tonePalette = {
                  success: { bg: 'var(--success-soft)', col: 'var(--success)' },
                  danger:  { bg: 'var(--danger-soft)',  col: 'var(--danger)' },
                  info:    { bg: 'var(--primary-soft)', col: 'var(--primary-text)' },
                  muted:   { bg: 'var(--bg-subtle)',    col: 'var(--text-tertiary)' },
                }[tone];
                return (
                  <tr key={e.id} style={{ borderTop: '1px solid var(--border-light)' }}>
                    <td style={tdStyle} title={e.created_at}>{timeAgo(e.created_at)}</td>
                    <td style={tdStyle}>
                      <span style={{ display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: tonePalette.bg, color: tonePalette.col }}>
                        {KIND_LABEL[e.kind] || e.kind}
                      </span>
                    </td>
                    <td style={tdStyle}>{e.email || '—'}</td>
                    <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>{e.ip || '—'}</td>
                    <td style={{ ...tdStyle, maxWidth: 320, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', color: 'var(--text-tertiary)' }} title={e.user_agent}>{e.user_agent || '—'}</td>
                    <td style={{ ...tdStyle, color: 'var(--text-tertiary)' }}>{e.detail || '—'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* USERS */}
      <div className="w-glass" style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 style={{ fontSize: 14, fontWeight: 600, margin: 0, letterSpacing: '-0.01em' }}>Utilisateurs ({users.length})</h3>
        </div>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
            <thead>
              <tr style={{ background: 'var(--bg-subtle)', textAlign: 'left' }}>
                <th style={thStyle}>Email</th>
                <th style={thStyle}>Nom</th>
                <th style={thStyle}>Inscrit</th>
                <th style={thStyle}>Dernier login</th>
                <th style={thStyle}>IP dernier login</th>
                <th style={thStyle}>Connexions</th>
                <th style={thStyle}>Statut</th>
                <th style={thStyle}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} style={{ borderTop: '1px solid var(--border-light)', opacity: u.is_active ? 1 : 0.6 }}>
                  <td style={tdStyle}>{u.email}</td>
                  <td style={tdStyle}>{u.full_name || '—'}</td>
                  <td style={tdStyle} title={u.created_at}>{timeAgo(u.created_at)}</td>
                  <td style={tdStyle} title={u.last_login_at}>{timeAgo(u.last_login_at)}</td>
                  <td style={{ ...tdStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 11.5 }}>{u.last_login_ip || '—'}</td>
                  <td style={{ ...tdStyle, fontVariantNumeric: 'tabular-nums' }}>{u.login_count}</td>
                  <td style={tdStyle}>
                    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: u.is_active ? 'var(--success-soft)' : 'var(--bg-subtle)', color: u.is_active ? 'var(--success)' : 'var(--text-tertiary)' }}>
                      {u.is_active ? <ShieldCheck size={11}/> : null} {u.is_active ? 'Actif' : 'Inactif'}
                    </span>
                    {u.is_admin && (
                      <span style={{ marginLeft: 6, display: 'inline-block', padding: '2px 8px', borderRadius: 999, fontSize: 11, fontWeight: 600, background: 'var(--primary-soft)', color: 'var(--primary-text)' }}>
                        Admin
                      </span>
                    )}
                  </td>
                  <td style={{ ...tdStyle, whiteSpace: 'nowrap' }}>
                    {!u.is_admin && (
                      <div style={{ display: 'flex', gap: 6 }}>
                        <button
                          onClick={() => handleToggle(u.id, u.email)}
                          disabled={actionLoading === u.id}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', opacity: actionLoading === u.id ? 0.5 : 1 }}
                        >
                          {u.is_active ? 'Suspendre' : 'Réactiver'}
                        </button>
                        <button
                          onClick={() => handleDelete(u.id, u.email)}
                          disabled={actionLoading === u.id}
                          style={{ padding: '4px 10px', borderRadius: 6, border: '1px solid var(--danger-soft)', background: 'transparent', color: 'var(--danger)', fontSize: 11.5, fontWeight: 600, cursor: 'pointer', opacity: actionLoading === u.id ? 0.5 : 1 }}
                        >
                          Supprimer
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

const thStyle = { padding: '11px 16px', fontWeight: 600, fontSize: 11.5, color: 'var(--text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.04em' };
const tdStyle = { padding: '11px 16px', verticalAlign: 'middle' };
