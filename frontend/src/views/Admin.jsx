// ============================================================================
// Admin — SaaS management panel. Visible only to is_admin users.
//
// Six sections:
//   1. Vue d'ensemble — product KPIs + growth chart + security alerts
//   2. Utilisateurs   — rich user table with actions
//   3. Foyers         — household table with stats
//   4. Abonnements    — plan management per household
//   5. Sécurité       — auth events log
//   6. Système        — API health + deploy info
// ============================================================================
import { useEffect, useState, useMemo, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import * as api from '../api.js';
import {
  Users, Home, CreditCard, ShieldAlert, ShieldCheck, Activity,
  Lock, RefreshCw, TrendingUp, Database, Server, CheckCircle2,
  XCircle, MailCheck, Trash2, ToggleLeft, ToggleRight, ChevronDown,
  ChevronUp, Globe, AlertTriangle,
} from 'lucide-react';

// ─── helpers ────────────────────────────────────────────────────────────────

function timeAgo(iso) {
  if (!iso) return '—';
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  if (diff < 60) return `${diff}s`;
  if (diff < 3600) return `${Math.floor(diff / 60)}min`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)}j`;
  return new Date(iso).toLocaleDateString('fr-FR', { day: '2-digit', month: '2-digit', year: '2-digit' });
}

function fmt(n) {
  if (n == null) return '—';
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M€`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(0)}k€`;
  return `${n.toFixed(0)}€`;
}

const PLAN_COLORS = {
  solo:   { bg: 'var(--bg-subtle)',       color: 'var(--text-secondary)' },
  pro:    { bg: 'var(--primary-soft)',    color: 'var(--color-w-accent-2)' },
  family: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  admin:  { bg: 'rgba(168,85,247,0.15)', color: '#a855f7' },
};

const PLAN_LABELS = { solo: 'Solo', pro: 'Pro', family: 'Famille', admin: 'Admin' };

const KIND_LABEL = {
  login_success: 'Connexion',
  login_failure: 'Échec login',
  register_success: 'Inscription',
  register_failure: 'Échec inscription',
  password_reset_request: 'Reset demandé',
  password_reset_success: 'Reset effectué',
  password_reset_failure: 'Échec reset',
  logout: 'Déconnexion',
  user_suspended: 'Suspension',
  user_reactivated: 'Réactivation',
  user_deleted: 'Suppression',
  plan_changed: 'Changement plan',
  admin_password_reset: 'Reset admin',
};

const KIND_TONE = {
  login_success: 'success', register_success: 'success',
  password_reset_success: 'success', user_reactivated: 'success',
  login_failure: 'danger', register_failure: 'danger',
  password_reset_failure: 'danger', user_suspended: 'warn',
  user_deleted: 'danger', plan_changed: 'info',
  password_reset_request: 'info', logout: 'muted',
  admin_password_reset: 'warn',
};

const TONE_STYLE = {
  success: { bg: 'rgba(52,211,153,0.12)', color: '#34d399' },
  danger:  { bg: 'rgba(239,68,68,0.12)',  color: '#f87171' },
  warn:    { bg: 'rgba(251,191,36,0.12)', color: '#fbbf24' },
  info:    { bg: 'rgba(99,102,241,0.12)', color: '#818cf8' },
  muted:   { bg: 'var(--bg-subtle)',      color: 'var(--text-tertiary)' },
};

const PlanBadge = ({ plan }) => {
  const s = PLAN_COLORS[plan] || PLAN_COLORS.solo;
  return (
    <span style={{ display:'inline-block', padding:'2px 9px', borderRadius:999, fontSize:11, fontWeight:700,
                   background: s.bg, color: s.color }}>
      {PLAN_LABELS[plan] || plan}
    </span>
  );
};

const KindBadge = ({ kind }) => {
  const tone = KIND_TONE[kind] || 'muted';
  const s = TONE_STYLE[tone];
  return (
    <span style={{ display:'inline-block', padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:600,
                   background: s.bg, color: s.color }}>
      {KIND_LABEL[kind] || kind}
    </span>
  );
};

// ─── main component ──────────────────────────────────────────────────────────

const SECTIONS = [
  { id: 'overview',       label: 'Vue d\'ensemble', icon: TrendingUp },
  { id: 'users',          label: 'Utilisateurs',    icon: Users },
  { id: 'households',     label: 'Foyers',          icon: Home },
  { id: 'subscriptions',  label: 'Abonnements',     icon: CreditCard },
  { id: 'security',       label: 'Sécurité',        icon: ShieldAlert },
  { id: 'system',         label: 'Système',         icon: Server },
];

export function Admin() {
  const [section, setSection] = useState('overview');
  const [data, setData] = useState({ metrics: null, growth: [], stats: null, users: [], households: [], events: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [actionLoading, setActionLoading] = useState(null);
  const [expandedRow, setExpandedRow] = useState(null);
  const [userSearch, setUserSearch] = useState('');
  const [kindFilter, setKindFilter] = useState('');
  const [apiHealth, setApiHealth] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError(null);
    try {
      const [metrics, growth, stats, users, households, events] = await Promise.all([
        api.admin.metrics(),
        api.admin.growth(),
        api.admin.stats(),
        api.admin.users(),
        api.admin.households(),
        api.admin.authEvents(200),
      ]);
      setData({ metrics, growth: growth || [], stats, users: users || [], households: households || [], events: events || [] });
    } catch (e) {
      setError(e.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  // Ping API for system health
  useEffect(() => {
    const t0 = Date.now();
    api.auth.me()
      .then(() => setApiHealth({ ok: true, ms: Date.now() - t0 }))
      .catch(() => setApiHealth({ ok: false, ms: null }));
  }, []);

  const filteredUsers = useMemo(() =>
    data.users.filter(u =>
      !userSearch ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.full_name || '').toLowerCase().includes(userSearch.toLowerCase())
    ), [data.users, userSearch]);

  const filteredEvents = useMemo(() =>
    data.events.filter(e => !kindFilter || e.kind === kindFilter),
    [data.events, kindFilter]);

  // ── actions ────────────────────────────────────────────────────────────────
  const handleToggle = async (userId, email) => {
    if (!window.confirm(`Suspendre / réactiver ${email} ?`)) return;
    setActionLoading(userId);
    try {
      const updated = await api.admin.toggleUser(userId);
      setData(d => ({ ...d, users: d.users.map(u => u.id === userId ? { ...u, is_active: updated.is_active } : u) }));
    } catch (e) { alert(`Erreur : ${e.message}`); }
    finally { setActionLoading(null); }
  };

  const handleDelete = async (userId, email) => {
    if (!window.confirm(`⚠️ Supprimer définitivement ${email} ? IRRÉVERSIBLE.`)) return;
    if (!window.confirm(`Confirmer la suppression de ${email} ?`)) return;
    setActionLoading(userId);
    try {
      await api.admin.deleteUser(userId);
      setData(d => ({ ...d, users: d.users.filter(u => u.id !== userId) }));
    } catch (e) { alert(`Erreur : ${e.message}`); }
    finally { setActionLoading(null); }
  };

  const handlePlan = async (householdId, currentPlan) => {
    const plans = ['solo', 'pro', 'family', 'admin'];
    const choice = window.prompt(
      `Changer le plan du foyer\nActuel : ${currentPlan}\nValeurs : ${plans.join(' / ')}`,
      currentPlan
    );
    if (!choice || choice === currentPlan) return;
    setActionLoading(householdId);
    try {
      const updated = await api.admin.updatePlan(householdId, choice.trim().toLowerCase());
      setData(d => ({
        ...d,
        households: d.households.map(h => h.id === householdId ? { ...h, plan: updated.plan, plan_label: updated.plan_label } : h),
        users: d.users.map(u => u.household_id === householdId ? { ...u, plan: updated.plan } : u),
      }));
    } catch (e) { alert(`Erreur : ${e.message}`); }
    finally { setActionLoading(null); }
  };

  const handleResetPassword = async (userId, email) => {
    if (!window.confirm(`Envoyer un email de réinitialisation à ${email} ?`)) return;
    setActionLoading(userId);
    try {
      const res = await api.admin.resetPassword(userId);
      alert(`✅ ${res.message}`);
    } catch (e) { alert(`Erreur : ${e.message}`); }
    finally { setActionLoading(null); }
  };

  // ── render ─────────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'60vh', color:'var(--text-muted)' }}>
        <RefreshCw size={20} style={{ animation:'spin 1s linear infinite', marginRight:10 }}/>
        Chargement...
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ padding:32, color:'var(--danger)', display:'flex', alignItems:'center', gap:10 }}>
        <AlertTriangle size={20}/> {error}
        <button onClick={load} style={btnStyle}>Réessayer</button>
      </div>
    );
  }

  const { metrics, growth, stats, users, households, events } = data;

  return (
    <div style={{ display:'flex', flexDirection:'column', height:'100%' }}>
      {/* Header */}
      <div style={{ padding:'20px 28px 0', borderBottom:'1px solid var(--color-w-border)' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
          <div>
            <h1 style={{ fontSize:22, fontWeight:700, letterSpacing:'-0.02em', margin:0 }}>Administration</h1>
            <p style={{ fontSize:13, color:'var(--text-muted)', margin:'4px 0 0' }}>Gestion de la plateforme Trove</p>
          </div>
          <button onClick={load} style={{ ...btnStyle, display:'flex', alignItems:'center', gap:6 }}>
            <RefreshCw size={13}/> Actualiser
          </button>
        </div>
        {/* Nav tabs */}
        <nav style={{ display:'flex', gap:2 }}>
          {SECTIONS.map(s => {
            const Icon = s.icon;
            const active = section === s.id;
            return (
              <button key={s.id} onClick={() => setSection(s.id)} style={{
                display:'flex', alignItems:'center', gap:6, padding:'8px 14px',
                borderRadius:'8px 8px 0 0', border:'none', cursor:'pointer', fontSize:13, fontWeight:active?600:400,
                background: active ? 'var(--bg-card)' : 'transparent',
                color: active ? 'var(--color-w-text)' : 'var(--text-muted)',
                borderBottom: active ? '2px solid var(--color-w-accent-2)' : '2px solid transparent',
                transition:'all 0.15s',
              }}>
                <Icon size={14}/> {s.label}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Content */}
      <div style={{ flex:1, overflowY:'auto', padding:'24px 28px' }}>

        {/* ── 1. VUE D'ENSEMBLE ─────────────────────────────────────────── */}
        {section === 'overview' && (
          <div style={{ display:'flex', flexDirection:'column', gap:20 }}>
            {/* KPI cards */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12 }}>
              {[
                { label:'Utilisateurs', value: metrics?.total_users ?? '—', sub:`${metrics?.active_users ?? 0} actifs`, icon: Users, color:'var(--color-w-accent-2)' },
                { label:'Foyers', value: metrics?.total_households ?? '—', icon: Home, color:'#34d399' },
                { label:'Transactions', value: (metrics?.total_transactions ?? 0).toLocaleString('fr-FR'), icon: Activity, color:'#fbbf24' },
                { label:'Actifs suivis', value: fmt(metrics?.total_assets_value), sub:`net ${fmt(metrics?.net_assets_value)}`, icon: TrendingUp, color:'#a855f7' },
                { label:'Comptes bancaires', value: metrics?.total_accounts ?? '—', icon: Database, color:'#60a5fa' },
                { label:'Nouveaux (30j)', value: metrics?.new_users_this_month ?? '—', sub:`${metrics?.new_users_this_week ?? 0} cette semaine`, icon: Users, color:'#f97316' },
              ].map(k => (
                <div key={k.label} style={{ background:'var(--bg-card)', borderRadius:12, padding:'16px 18px', border:'1px solid var(--color-w-border)' }}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                    <span style={{ fontSize:11.5, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)' }}>{k.label}</span>
                    <k.icon size={16} style={{ color: k.color }}/>
                  </div>
                  <div style={{ fontSize:26, fontWeight:700, letterSpacing:'-0.02em', fontVariantNumeric:'tabular-nums' }}>{k.value}</div>
                  {k.sub && <div style={{ fontSize:11.5, color:'var(--text-muted)', marginTop:4 }}>{k.sub}</div>}
                </div>
              ))}
            </div>

            {/* Plans breakdown */}
            {metrics?.plans_breakdown && (
              <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'18px 20px', border:'1px solid var(--color-w-border)' }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:'0 0 14px', letterSpacing:'-0.01em' }}>Répartition des plans</h3>
                <div style={{ display:'flex', gap:12, flexWrap:'wrap' }}>
                  {Object.entries(metrics.plans_breakdown).map(([plan, count]) => (
                    <div key={plan} style={{ display:'flex', alignItems:'center', gap:8, padding:'8px 14px', borderRadius:8, background:'var(--bg-subtle)', border:'1px solid var(--color-w-border)' }}>
                      <PlanBadge plan={plan}/>
                      <span style={{ fontSize:18, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{count}</span>
                      <span style={{ fontSize:12, color:'var(--text-muted)' }}>foyer{count > 1 ? 's' : ''}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Growth chart */}
            <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'18px 20px', border:'1px solid var(--color-w-border)' }}>
              <h3 style={{ fontSize:13, fontWeight:600, margin:'0 0 16px', letterSpacing:'-0.01em' }}>Inscriptions — 30 derniers jours</h3>
              {growth.length > 0 ? (
                <ResponsiveContainer width="100%" height={160}>
                  <BarChart data={growth} margin={{ top:0, right:0, bottom:0, left:-20 }}>
                    <XAxis dataKey="date" tick={{ fontSize:10, fill:'var(--text-muted)' }}
                      tickFormatter={d => d.slice(5)} interval={6}/>
                    <YAxis tick={{ fontSize:10, fill:'var(--text-muted)' }} allowDecimals={false}/>
                    <Tooltip formatter={(v) => [v, 'Inscriptions']}
                      labelFormatter={l => new Date(l).toLocaleDateString('fr-FR')}
                      contentStyle={{ background:'var(--bg-card)', border:'1px solid var(--color-w-border)', borderRadius:8, fontSize:12 }}/>
                    <Bar dataKey="signups" radius={[4,4,0,0]} maxBarSize={28}>
                      {growth.map((entry, i) => (
                        <Cell key={i} fill={entry.signups > 0 ? 'var(--color-w-accent-2)' : 'var(--bg-subtle)'}/>
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div style={{ textAlign:'center', color:'var(--text-muted)', padding:'24px 0', fontSize:13 }}>
                  Pas encore assez de données
                </div>
              )}
            </div>

            {/* Security alerts */}
            {stats?.lockouts?.length > 0 && (
              <div style={{ background:'rgba(239,68,68,0.08)', borderRadius:12, padding:'16px 20px', border:'1px solid rgba(239,68,68,0.2)' }}>
                <h3 style={{ fontSize:13, fontWeight:600, margin:'0 0 12px', color:'#f87171', display:'flex', alignItems:'center', gap:6 }}>
                  <AlertTriangle size={14}/> {stats.lockouts.length} compte{stats.lockouts.length > 1 ? 's' : ''} bloqué{stats.lockouts.length > 1 ? 's' : ''}
                </h3>
                {stats.lockouts.map(l => (
                  <div key={l.email} style={{ fontSize:12.5, color:'var(--text-secondary)', marginBottom:4 }}>
                    {l.email} — {l.failures} échecs
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── 2. UTILISATEURS ─────────────────────────────────────────────── */}
        {section === 'users' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'flex', alignItems:'center', gap:12 }}>
              <input
                placeholder="Rechercher par email ou nom…"
                value={userSearch}
                onChange={e => setUserSearch(e.target.value)}
                style={{ ...inputStyle, flex:1, maxWidth:340 }}
              />
              <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{filteredUsers.length} utilisateur{filteredUsers.length !== 1 ? 's' : ''}</span>
            </div>
            <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--color-w-border)', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:'var(--bg-subtle)' }}>
                    {['Email','Nom','Plan','Inscrit','Dernière activité','Transactions','Statut','Actions'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <>
                      <tr key={u.id}
                        style={{ borderTop:'1px solid var(--color-w-border)', opacity: u.is_active ? 1 : 0.55,
                          cursor:'pointer', transition:'background 0.1s' }}
                        onClick={() => setExpandedRow(expandedRow === u.id ? null : u.id)}
                      >
                        <td style={tdStyle}>
                          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                            <span>{u.email}</span>
                            {u.is_admin && <span style={{ fontSize:10, fontWeight:700, padding:'1px 6px', borderRadius:999, background:'rgba(168,85,247,0.15)', color:'#a855f7' }}>admin</span>}
                          </div>
                        </td>
                        <td style={tdStyle}>{u.full_name || '—'}</td>
                        <td style={tdStyle}><PlanBadge plan={u.plan}/></td>
                        <td style={{ ...tdStyle, color:'var(--text-muted)' }} title={u.created_at}>{timeAgo(u.created_at)}</td>
                        <td style={{ ...tdStyle, color:'var(--text-muted)' }} title={u.last_activity}>{u.last_activity ? timeAgo(u.last_activity + 'T00:00:00') : '—'}</td>
                        <td style={{ ...tdStyle, fontVariantNumeric:'tabular-nums' }}>{u.transaction_count}</td>
                        <td style={tdStyle}>
                          <span style={{ display:'inline-flex', alignItems:'center', gap:4, padding:'2px 8px', borderRadius:999, fontSize:11, fontWeight:600,
                            background: u.is_active ? 'rgba(52,211,153,0.12)' : 'var(--bg-subtle)',
                            color: u.is_active ? '#34d399' : 'var(--text-muted)' }}>
                            {u.is_active ? <ShieldCheck size={10}/> : null}
                            {u.is_active ? 'Actif' : 'Suspendu'}
                          </span>
                        </td>
                        <td style={{ ...tdStyle, whiteSpace:'nowrap' }} onClick={e => e.stopPropagation()}>
                          {!u.is_admin && (
                            <div style={{ display:'flex', gap:5 }}>
                              <button onClick={() => handleResetPassword(u.id, u.email)}
                                disabled={actionLoading === u.id}
                                title="Envoyer email reset" style={iconBtnStyle('#60a5fa')}>
                                <MailCheck size={13}/>
                              </button>
                              <button onClick={() => handleToggle(u.id, u.email)}
                                disabled={actionLoading === u.id}
                                title={u.is_active ? 'Suspendre' : 'Réactiver'}
                                style={iconBtnStyle(u.is_active ? '#fbbf24' : '#34d399')}>
                                {u.is_active ? <ToggleLeft size={13}/> : <ToggleRight size={13}/>}
                              </button>
                              <button onClick={() => handleDelete(u.id, u.email)}
                                disabled={actionLoading === u.id}
                                title="Supprimer" style={iconBtnStyle('#f87171')}>
                                <Trash2 size={13}/>
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                      {expandedRow === u.id && (
                        <tr key={`${u.id}-detail`} style={{ background:'var(--bg-subtle)' }}>
                          <td colSpan={8} style={{ padding:'14px 20px', fontSize:12.5, color:'var(--text-secondary)' }}>
                            <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                              <div><span style={{ color:'var(--text-muted)' }}>Foyer :</span> {u.household_name} <span style={{ color:'var(--text-muted)', fontFamily:'monospace', fontSize:11 }}>({u.household_id?.slice(0, 8)}…)</span></div>
                              <div><span style={{ color:'var(--text-muted)' }}>IP dernier login :</span> {u.last_login_ip || '—'}</div>
                              <div><span style={{ color:'var(--text-muted)' }}>Connexions totales :</span> {u.login_count}</div>
                              <div><span style={{ color:'var(--text-muted)' }}>Dernier login :</span> {timeAgo(u.last_login_at)}</div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 3. FOYERS ───────────────────────────────────────────────────── */}
        {section === 'households' && (
          <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--color-w-border)', overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
              <thead>
                <tr style={{ background:'var(--bg-subtle)' }}>
                  {['Foyer','Propriétaire','Plan','Créé','Membres','Comptes','Transactions','Patrimoine net','Actions'].map(h => (
                    <th key={h} style={thStyle}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {households.map(h => (
                  <>
                    <tr key={h.id} style={{ borderTop:'1px solid var(--color-w-border)', cursor:'pointer' }}
                      onClick={() => setExpandedRow(expandedRow === h.id ? null : h.id)}>
                      <td style={{ ...tdStyle, fontWeight:600 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6 }}>
                          {expandedRow === h.id ? <ChevronUp size={13}/> : <ChevronDown size={13}/>}
                          {h.name}
                        </div>
                      </td>
                      <td style={{ ...tdStyle, color:'var(--text-muted)' }}>{h.owner_email || '—'}</td>
                      <td style={tdStyle}><PlanBadge plan={h.plan}/></td>
                      <td style={{ ...tdStyle, color:'var(--text-muted)' }}>{timeAgo(h.created_at)}</td>
                      <td style={{ ...tdStyle, fontVariantNumeric:'tabular-nums', textAlign:'center' }}>{h.member_count}</td>
                      <td style={{ ...tdStyle, fontVariantNumeric:'tabular-nums', textAlign:'center' }}>{h.account_count}</td>
                      <td style={{ ...tdStyle, fontVariantNumeric:'tabular-nums', textAlign:'center' }}>{h.transaction_count}</td>
                      <td style={{ ...tdStyle, fontVariantNumeric:'tabular-nums', fontWeight:600, color: h.net_worth >= 0 ? 'var(--color-w-success)' : 'var(--danger)' }}>
                        {fmt(h.net_worth)}
                      </td>
                      <td style={{ ...tdStyle, whiteSpace:'nowrap' }} onClick={e => e.stopPropagation()}>
                        <button onClick={() => handlePlan(h.id, h.plan)}
                          disabled={actionLoading === h.id}
                          style={{ ...btnStyle, fontSize:11 }}>
                          Changer plan
                        </button>
                      </td>
                    </tr>
                    {expandedRow === h.id && (
                      <tr key={`${h.id}-detail`} style={{ background:'var(--bg-subtle)' }}>
                        <td colSpan={9} style={{ padding:'14px 20px', fontSize:12.5, color:'var(--text-secondary)' }}>
                          <div style={{ display:'flex', gap:24, flexWrap:'wrap' }}>
                            <div><span style={{ color:'var(--text-muted)' }}>ID :</span> <span style={{ fontFamily:'monospace', fontSize:11 }}>{h.id}</span></div>
                            <div><span style={{ color:'var(--text-muted)' }}>Actifs bruts :</span> {fmt(h.assets_value)}</div>
                            <div><span style={{ color:'var(--text-muted)' }}>Passifs :</span> {fmt(h.liabilities_value)}</div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* ── 4. ABONNEMENTS ──────────────────────────────────────────────── */}
        {section === 'subscriptions' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Plan summary */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(180px, 1fr))', gap:12 }}>
              {Object.entries(PLAN_LABELS).map(([plan, label]) => {
                const count = households.filter(h => h.plan === plan).length;
                const s = PLAN_COLORS[plan];
                return (
                  <div key={plan} style={{ background:'var(--bg-card)', borderRadius:12, padding:'18px 20px',
                    border:`1px solid var(--color-w-border)` }}>
                    <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:10 }}>
                      <PlanBadge plan={plan}/>
                    </div>
                    <div style={{ fontSize:28, fontWeight:700, fontVariantNumeric:'tabular-nums' }}>{count}</div>
                    <div style={{ fontSize:12, color:'var(--text-muted)', marginTop:4 }}>foyer{count !== 1 ? 's' : ''}</div>
                  </div>
                );
              })}
            </div>

            {/* Stripe placeholder */}
            <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'24px', border:'1px dashed var(--color-w-border)', textAlign:'center' }}>
              <CreditCard size={32} style={{ color:'var(--text-muted)', margin:'0 auto 12px' }}/>
              <h3 style={{ fontSize:15, fontWeight:600, margin:'0 0 8px' }}>Stripe — à venir</h3>
              <p style={{ fontSize:13, color:'var(--text-muted)', maxWidth:400, margin:'0 auto 16px' }}>
                La gestion des paiements en ligne sera disponible une fois l'intégration Stripe connectée.
                Les colonnes MRR, date de renouvellement et historique de paiement apparaîtront ici.
              </p>
              <div style={{ display:'flex', gap:16, justifyContent:'center', flexWrap:'wrap', fontSize:13, color:'var(--text-muted)' }}>
                <span>✓ MRR / ARR</span>
                <span>✓ Churn rate</span>
                <span>✓ Paiements échoués</span>
                <span>✓ Renouvellements à venir</span>
              </div>
            </div>

            {/* Per-household plan table */}
            <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--color-w-border)', overflow:'hidden' }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--color-w-border)' }}>
                <h3 style={{ fontSize:13.5, fontWeight:600, margin:0 }}>Plans par foyer</h3>
              </div>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:'var(--bg-subtle)' }}>
                    {['Foyer','Propriétaire','Plan actuel','Membres','Transactions','Action'].map(h => (
                      <th key={h} style={thStyle}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {households.map(h => (
                    <tr key={h.id} style={{ borderTop:'1px solid var(--color-w-border)' }}>
                      <td style={{ ...tdStyle, fontWeight:600 }}>{h.name}</td>
                      <td style={{ ...tdStyle, color:'var(--text-muted)' }}>{h.owner_email || '—'}</td>
                      <td style={tdStyle}><PlanBadge plan={h.plan}/></td>
                      <td style={{ ...tdStyle, textAlign:'center', fontVariantNumeric:'tabular-nums' }}>{h.member_count}</td>
                      <td style={{ ...tdStyle, textAlign:'center', fontVariantNumeric:'tabular-nums' }}>{h.transaction_count}</td>
                      <td style={tdStyle}>
                        <button onClick={() => handlePlan(h.id, h.plan)} disabled={actionLoading === h.id} style={btnStyle}>
                          Modifier
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 5. SÉCURITÉ ─────────────────────────────────────────────────── */}
        {section === 'security' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            {/* Security KPIs */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(160px, 1fr))', gap:12 }}>
              {[
                { label:'Échecs login (24h)', value: stats?.failures_24h ?? '—', tone: (stats?.failures_24h ?? 0) > 5 ? 'danger' : 'success' },
                { label:'Comptes bloqués', value: stats?.lockouts?.length ?? '—', tone: (stats?.lockouts?.length ?? 0) > 0 ? 'danger' : 'success' },
                { label:'Seuil lockout', value: `${stats?.lockout_threshold ?? 5} échecs`, tone:'muted' },
                { label:'Durée blocage', value: `${stats?.lockout_duration_minutes ?? 30} min`, tone:'muted' },
              ].map(k => (
                <div key={k.label} style={{ background:'var(--bg-card)', borderRadius:12, padding:'16px 18px', border:'1px solid var(--color-w-border)' }}>
                  <div style={{ fontSize:11, fontWeight:600, textTransform:'uppercase', letterSpacing:'0.06em', color:'var(--text-muted)', marginBottom:8 }}>{k.label}</div>
                  <div style={{ fontSize:24, fontWeight:700, color: TONE_STYLE[k.tone]?.color || 'inherit' }}>{k.value}</div>
                </div>
              ))}
            </div>

            {/* Event filter */}
            <div style={{ display:'flex', alignItems:'center', gap:10 }}>
              <select value={kindFilter} onChange={e => setKindFilter(e.target.value)} style={inputStyle}>
                <option value="">Tous les types</option>
                {Object.entries(KIND_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
              <span style={{ fontSize:12.5, color:'var(--text-muted)' }}>{filteredEvents.length} événements</span>
            </div>

            {/* Events table */}
            <div style={{ background:'var(--bg-card)', borderRadius:12, border:'1px solid var(--color-w-border)', overflow:'hidden' }}>
              <table style={{ width:'100%', borderCollapse:'collapse', fontSize:12.5 }}>
                <thead>
                  <tr style={{ background:'var(--bg-subtle)' }}>
                    {['Quand','Type','Email','IP','User-Agent','Détail'].map(h => <th key={h} style={thStyle}>{h}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {filteredEvents.map(e => (
                    <tr key={e.id} style={{ borderTop:'1px solid var(--color-w-border)' }}>
                      <td style={{ ...tdStyle, color:'var(--text-muted)', whiteSpace:'nowrap' }} title={e.created_at}>{timeAgo(e.created_at)}</td>
                      <td style={tdStyle}><KindBadge kind={e.kind}/></td>
                      <td style={tdStyle}>{e.email || '—'}</td>
                      <td style={{ ...tdStyle, fontFamily:'monospace', fontSize:11.5 }}>{e.ip || '—'}</td>
                      <td style={{ ...tdStyle, color:'var(--text-muted)', maxWidth:280, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}
                        title={e.user_agent}>{e.user_agent?.split(' ').slice(0,4).join(' ') || '—'}</td>
                      <td style={{ ...tdStyle, color:'var(--text-muted)', fontStyle: e.detail ? 'normal' : 'italic' }}>{e.detail || '—'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ── 6. SYSTÈME ──────────────────────────────────────────────────── */}
        {section === 'system' && (
          <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(240px, 1fr))', gap:16 }}>
              {/* API health */}
              <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'20px', border:'1px solid var(--color-w-border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <Server size={18} style={{ color:'var(--color-w-accent-2)' }}/>
                  <h3 style={{ fontSize:14, fontWeight:600, margin:0 }}>API Railway</h3>
                </div>
                {apiHealth ? (
                  <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                    {apiHealth.ok
                      ? <CheckCircle2 size={20} style={{ color:'#34d399' }}/>
                      : <XCircle size={20} style={{ color:'#f87171' }}/>}
                    <span style={{ fontSize:14, fontWeight:600, color: apiHealth.ok ? '#34d399' : '#f87171' }}>
                      {apiHealth.ok ? `Opérationnel — ${apiHealth.ms}ms` : 'Hors ligne'}
                    </span>
                  </div>
                ) : (
                  <span style={{ color:'var(--text-muted)', fontSize:13 }}>Vérification…</span>
                )}
                <div style={{ marginTop:12, fontSize:12, color:'var(--text-muted)' }}>
                  <div>Backend : FastAPI + SQLAlchemy</div>
                  <div style={{ marginTop:4 }}>Auto-deploy depuis GitHub main</div>
                </div>
              </div>

              {/* DB stats */}
              <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'20px', border:'1px solid var(--color-w-border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <Database size={18} style={{ color:'#a855f7' }}/>
                  <h3 style={{ fontSize:14, fontWeight:600, margin:0 }}>Base de données</h3>
                </div>
                <div style={{ fontSize:13, display:'flex', flexDirection:'column', gap:6, color:'var(--text-secondary)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>Provider</span><span>Supabase (PostgreSQL)</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>Utilisateurs</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{metrics?.total_users ?? '—'}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>Transactions</span><span style={{ fontVariantNumeric:'tabular-nums' }}>{(metrics?.total_transactions ?? 0).toLocaleString('fr-FR')}</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>Actifs suivis</span><span>{fmt(metrics?.total_assets_value)}</span>
                  </div>
                </div>
              </div>

              {/* Frontend */}
              <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'20px', border:'1px solid var(--color-w-border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <Globe size={18} style={{ color:'#60a5fa' }}/>
                  <h3 style={{ fontSize:14, fontWeight:600, margin:0 }}>Frontend</h3>
                </div>
                <div style={{ fontSize:13, display:'flex', flexDirection:'column', gap:6, color:'var(--text-secondary)' }}>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>Provider</span><span>Vercel</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>Framework</span><span>React 18 + Vite</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>Auto-deploy</span><span style={{ color:'#34d399' }}>✓ Actif</span>
                  </div>
                  <div style={{ display:'flex', justifyContent:'space-between' }}>
                    <span style={{ color:'var(--text-muted)' }}>PWA</span><span style={{ color:'#34d399' }}>✓ Installable</span>
                  </div>
                </div>
              </div>

              {/* Security config */}
              <div style={{ background:'var(--bg-card)', borderRadius:12, padding:'20px', border:'1px solid var(--color-w-border)' }}>
                <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:14 }}>
                  <Lock size={18} style={{ color:'#fbbf24' }}/>
                  <h3 style={{ fontSize:14, fontWeight:600, margin:0 }}>Sécurité</h3>
                </div>
                <div style={{ fontSize:13, display:'flex', flexDirection:'column', gap:6, color:'var(--text-secondary)' }}>
                  {[
                    ['Auth', 'JWT httpOnly cookie'],
                    ['Mots de passe', 'bcrypt + HIBP'],
                    ['Brute-force', `Lockout après ${stats?.lockout_threshold ?? 5} échecs`],
                    ['HTTPS', 'HSTS + Secure cookies'],
                    ['CSP', 'Content-Security-Policy actif'],
                    ['2FA', 'TOTP — à venir'],
                  ].map(([k, v]) => (
                    <div key={k} style={{ display:'flex', justifyContent:'space-between' }}>
                      <span style={{ color:'var(--text-muted)' }}>{k}</span>
                      <span style={{ color: v.includes('à venir') ? '#fbbf24' : 'inherit' }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── styles ──────────────────────────────────────────────────────────────────
const thStyle = {
  padding: '10px 14px', fontWeight: 600, fontSize: 11,
  color: 'var(--text-muted)', textTransform: 'uppercase',
  letterSpacing: '0.05em', textAlign: 'left', whiteSpace: 'nowrap',
};
const tdStyle = { padding: '11px 14px', verticalAlign: 'middle' };
const btnStyle = {
  padding: '5px 12px', borderRadius: 6, border: '1px solid var(--color-w-border)',
  background: 'var(--bg-subtle)', color: 'var(--text-secondary)',
  fontSize: 12, fontWeight: 600, cursor: 'pointer',
};
const iconBtnStyle = (color) => ({
  width: 28, height: 28, borderRadius: 6, border: '1px solid var(--color-w-border)',
  background: 'var(--bg-subtle)', color, cursor: 'pointer',
  display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
  transition: 'all 0.15s',
});
const inputStyle = {
  padding: '7px 12px', borderRadius: 8, border: '1px solid var(--color-w-border)',
  background: 'var(--bg-subtle)', color: 'var(--color-w-text)', fontSize: 13,
  outline: 'none',
};
