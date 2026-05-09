// ============================================================================
// Settings — household, accounts, custom rules, bank connections, data tools
//
// Bundles SettingsView + the 4 sub-components it owns: CustomRulesSection,
// BankConnectionsSection, InstitutionPicker (modal), MemberEditor (modal).
// All read/write through the api module; the parent only passes data + a few
// CRUD callbacks.
// ============================================================================
import { useState, useEffect, useMemo, useCallback } from 'react';
import {
  Plus, Trash2, Edit3, Check, Upload, Download, Users, Wallet,
  Lightbulb, Sparkles, Activity, AlertCircle, RefreshCw, Link2, Unlink, X,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as api from '../api.js';
import { MEMBER_PALETTE } from '../constants.js';
import { ACCOUNT_ROLES, ACCOUNT_ROLE_KEYS, suggestAccountRole } from '../utils.js';

// ============================================================================
// SETTINGS
// ============================================================================
export function SettingsView({ members, accounts, accountBalances, saveMember, deleteMember, deleteAccount, updateAccount, transactions = [], exportData, importData, resetAllData, categories = [], fmt }) {
  const { t } = useTranslation();
  const [editingMember, setEditingMember] = useState(null);
  const COLORS = MEMBER_PALETTE;

  return (
    <div className="settings-view">
      <div className="subview-header">
        <div>
          <h1>{t('settings.title')}</h1>
          <p>{t('settings.subtitle')}</p>
        </div>
      </div>

      <section className="card">
        <div className="card-header">
          <h3><Users size={16}/> Membres du foyer</h3>
          <button className="secondary-btn" onClick={() => setEditingMember({ id: null, name: '', role: 'adult', color: COLORS[members.length % COLORS.length] })}><Plus size={14}/> Ajouter</button>
        </div>
        <div className="member-list">
          {members.map(m => (
            <div key={m.id} className="member-card">
              <span className="member-avatar large" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
              <div className="member-card-info">
                <div className="member-card-name">{m.name}</div>
                <div className="member-card-role">{m.role === 'adult' ? 'Adulte' : 'Enfant'}</div>
              </div>
              <button className="icon-btn-sm" onClick={() => setEditingMember(m)}><Edit3 size={13}/></button>
              <button className="icon-btn-sm" onClick={() => deleteMember(m.id)}><Trash2 size={13}/></button>
            </div>
          ))}
        </div>
      </section>

      <section className="card">
        <div className="card-header">
          <h3><Wallet size={16}/> Comptes bancaires</h3>
          <span className="card-meta">rôle = comment ce compte est compté dans les calculs</span>
        </div>
        <div className="member-list">
          {accounts.length === 0 && <div className="empty-mini"><Wallet size={24}/><p>Aucun compte. Importez un CSV.</p></div>}
          {accounts.map(a => {
            const owners = (a.memberIds || []).map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(' & ');
            const role = a.role || 'principal';
            const roleMeta = ACCOUNT_ROLES[role] || ACCOUNT_ROLES.principal;
            // Compute a role suggestion only when the user hasn't already
            // picked something other than the default 'principal'. Otherwise
            // we trust their explicit choice.
            const accTx = role === 'principal' ? transactions.filter(t => t.accountId === a.id) : [];
            const otherIds = accounts.filter(x => x.id !== a.id).map(x => x.id);
            const suggestion = role === 'principal' ? suggestAccountRole(accTx, otherIds) : null;
            const showSuggestion = suggestion && suggestion.role && suggestion.role !== 'principal' && suggestion.confidence !== 'low';
            return (
              <div key={a.id} className="member-card" style={{ alignItems: 'flex-start' }}>
                <span className="member-avatar large" style={{ background: 'var(--info)' }}>{a.bank?.charAt(0) || '?'}</span>
                <div className="member-card-info" style={{ flex: 1 }}>
                  <div className="member-card-name">{a.name}</div>
                  <div className="member-card-role">{a.bank} · {owners} · {fmt(accountBalances[a.id] || 0)}</div>
                  {showSuggestion && (
                    <div style={{ marginTop: 6, fontSize: 11.5, color: 'var(--text-tertiary)', fontStyle: 'italic', fontFamily: "'Source Serif 4', Georgia, serif" }}>
                      <span style={{ color: 'var(--primary)', fontStyle: 'normal', fontFamily: 'inherit' }}>↪ Suggéré : {ACCOUNT_ROLES[suggestion.role].label}</span> — {suggestion.reason}{' '}
                      <button
                        onClick={() => updateAccount(a.id, { role: suggestion.role })}
                        style={{ background: 'transparent', border: 'none', color: 'var(--primary)', cursor: 'pointer', textDecoration: 'underline', padding: 0, fontSize: 11.5, fontStyle: 'normal', fontFamily: 'inherit' }}
                      >
                        Appliquer
                      </button>
                    </div>
                  )}
                </div>
                {updateAccount && (
                  <select
                    value={role}
                    onChange={(e) => updateAccount(a.id, { role: e.target.value })}
                    title={roleMeta.desc}
                    style={{ fontSize: 12, padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-primary)', cursor: 'pointer', maxWidth: 200 }}
                  >
                    {ACCOUNT_ROLE_KEYS.map(k => (
                      <option key={k} value={k}>{ACCOUNT_ROLES[k].label}</option>
                    ))}
                  </select>
                )}
                <button className="icon-btn-sm" onClick={() => deleteAccount(a.id)}><Trash2 size={13}/></button>
              </div>
            );
          })}
        </div>
        <div className="settings-info" style={{ marginTop: 12 }}>
          <Lightbulb size={14}/>
          <span>
            <strong>Principal</strong> : tout compte. <strong>Dépenses</strong> (Revolut, voyage) : seules les sorties comptent.
            <strong> Épargne / Investissement</strong> : exclus du cashflow mensuel mais comptent dans le patrimoine.
            <strong> Professionnel</strong> : exclu du patrimoine personnel.
          </span>
        </div>
      </section>

      <section className="card">
        <div className="card-header"><h3>Données</h3></div>
        <div className="settings-buttons">
          <button className="secondary-btn" onClick={exportData}><Download size={14}/> Exporter (backup JSON)</button>
          <label className="secondary-btn" style={{ cursor: 'pointer' }}>
            <Upload size={14}/> Importer un backup
            <input type="file" accept=".json" onChange={importData} style={{ display: 'none' }}/>
          </label>
          <button className="danger-btn" onClick={resetAllData}><Trash2 size={14}/> Réinitialiser tout</button>
        </div>
        <div className="settings-info">
          <Lightbulb size={14}/>
          <span>Exportez un backup régulièrement. C'est votre filet de sécurité avant une migration ou un changement d'instance.</span>
        </div>
      </section>

      <BankConnectionsSection />

      <CustomRulesSection categories={categories} />

      {editingMember && <MemberEditor member={editingMember} onSave={(m) => { saveMember(m); setEditingMember(null); }} onCancel={() => setEditingMember(null)}/>}
    </div>
  );
}

/**
 * Custom regex rules manager — adds to / overrides the built-in pattern
 * library so the user can teach the categorizer about merchants Wealthly
 * doesn't know yet (boulangerie locale, médecin habituel, abonnement de
 * niche, etc.).
 *
 * Backend exposes /rules with list / create / delete (rules.create takes
 * { pattern: string, categoryId: string }).
 */
function CustomRulesSection({ categories }) {
  const [rules, setRules] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [newPattern, setNewPattern] = useState('');
  const [newCategory, setNewCategory] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const list = await api.rules.list();
      setRules(Array.isArray(list) ? list : []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Erreur de chargement');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { refresh(); }, [refresh]);

  const expenseCategories = useMemo(
    () => categories.filter((c) => c.type !== 'income'),
    [categories]
  );

  const onAdd = async (e) => {
    e.preventDefault();
    if (!newPattern.trim() || !newCategory) return;
    try {
      setSubmitting(true);
      // Validate the regex client-side first — fail fast with a clear message.
      try { new RegExp(newPattern, 'i'); } catch (re) {
        setError(`Regex invalide : ${re.message}`);
        setSubmitting(false);
        return;
      }
      await api.rules.create({ pattern: newPattern.trim(), category_slug: newCategory });
      setNewPattern('');
      setNewCategory('');
      setError(null);
      await refresh();
    } catch (err) {
      setError(err.message || "Impossible d'ajouter la règle");
    } finally {
      setSubmitting(false);
    }
  };

  const onDelete = async (id) => {
    if (!window.confirm('Supprimer cette règle ?')) return;
    try {
      await api.rules.delete(id);
      await refresh();
    } catch (err) {
      setError(err.message || 'Suppression impossible');
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <h3><Sparkles size={16}/> Règles de catégorisation</h3>
        <span className="card-meta">{rules.length} règle{rules.length > 1 ? 's' : ''}</span>
      </div>
      <p style={{ fontSize: 12, color: 'var(--text-tertiary)', margin: '0 0 14px', lineHeight: 1.5 }}>
        Apprenez au catégoriseur à reconnaître vos marchands habituels. Chaque règle est une expression régulière (insensible à la casse) testée sur le libellé de chaque transaction. Les règles personnalisées priment sur les règles par défaut.
      </p>

      {/* Add form */}
      <form onSubmit={onAdd} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
        <input
          type="text"
          value={newPattern}
          onChange={(e) => setNewPattern(e.target.value)}
          placeholder="ex : boulangerie martin|martin patisser"
          style={{ flex: '2 1 220px', minWidth: 0 }}
        />
        <select
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
          style={{ flex: '1 1 160px', minWidth: 0 }}
        >
          <option value="">Catégorie cible…</option>
          {expenseCategories.map((c) => (
            <option key={c.id} value={c.id}>{c.icon} {c.name}</option>
          ))}
        </select>
        <button
          type="submit"
          className="primary-btn"
          disabled={submitting || !newPattern.trim() || !newCategory}
        >
          <Plus size={14}/> Ajouter
        </button>
      </form>

      {error && (
        <div style={{ padding: '8px 12px', background: 'var(--danger-soft)', color: 'var(--danger-text)', borderRadius: 6, fontSize: 12, marginBottom: 12 }}>
          <AlertCircle size={12} style={{ verticalAlign: 'text-bottom', marginRight: 4 }}/>
          {error}
        </div>
      )}

      {loading ? (
        <div className="empty-mini"><Activity size={20}/><p>Chargement…</p></div>
      ) : rules.length === 0 ? (
        <div className="empty-mini">
          <Sparkles size={22}/>
          <p>Aucune règle personnalisée. Ajoute-en une ci-dessus pour qu'un libellé spécifique aille toujours dans la bonne catégorie.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          {rules.map((r) => {
            const slug = r.category_slug || r.categoryId;
            const cat = categories.find((c) => c.id === slug);
            return (
              <div
                key={r.id}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '10px 12px',
                  background: 'var(--bg-subtle)',
                  borderRadius: 6,
                  border: '1px solid var(--border)',
                }}
              >
                <code
                  style={{
                    flex: 1,
                    minWidth: 0,
                    fontFamily: 'JetBrains Mono, ui-monospace, Menlo, monospace',
                    fontSize: 12,
                    color: 'var(--text-primary)',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                  title={r.pattern}
                >
                  /{r.pattern}/i
                </code>
                <span
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 5,
                    padding: '4px 10px',
                    borderRadius: 6,
                    background: (cat?.color || '#999') + '22',
                    color: cat?.color || 'var(--text-secondary)',
                    fontSize: 11,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}
                >
                  {cat?.icon} {cat?.name || slug}
                </span>
                <button className="icon-btn-sm" onClick={() => onDelete(r.id)} title="Supprimer">
                  <Trash2 size={13}/>
                </button>
              </div>
            );
          })}
        </div>
      )}

      <div className="settings-info" style={{ marginTop: 14 }}>
        <Lightbulb size={14}/>
        <span>
          <strong>Astuce :</strong> sépare plusieurs marchands avec le pipe <code>|</code>. Exemple : <code>amazon|amzn|amz</code> couvre les 3 variantes. Les règles s'appliquent aux nouvelles transactions importées, et au bouton "Recatégoriser" sur chaque transaction.
        </span>
      </div>
    </section>
  );
}

// ============================================================================
// BANK CONNECTIONS SECTION (GoCardless)
// ============================================================================
function BankConnectionsSection() {
  const [connections, setConnections] = useState([]);
  const [loading, setLoading] = useState(false);
  const [unavailable, setUnavailable] = useState(false);
  const [picker, setPicker] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);

  const reload = async () => {
    setLoading(true);
    try {
      const list = await api.banks.listConnections();
      setConnections(list || []);
      setUnavailable(false);
    } catch (e) {
      // 503 = backend not configured, hide the section gracefully
      if (e.message && e.message.includes('non configurées')) {
        setUnavailable(true);
      } else {
        setSyncMessage({ kind: 'error', text: e.message });
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { reload(); }, []);

  const handleSync = async (id) => {
    setSyncingId(id);
    setSyncMessage(null);
    try {
      const res = await api.banks.sync(id);
      setSyncMessage({
        kind: res.error ? 'warn' : 'ok',
        text: res.error
          ? `${res.inserted} nouvelles · ${res.skipped} ignorées · erreur : ${res.error}`
          : `${res.inserted} nouvelles transaction${res.inserted > 1 ? 's' : ''}, ${res.skipped} ignorée${res.skipped > 1 ? 's' : ''}`,
      });
      await reload();
    } catch (e) {
      setSyncMessage({ kind: 'error', text: e.message });
    } finally {
      setSyncingId(null);
    }
  };

  const handleDelete = async (id, name) => {
    if (!confirm(`Déconnecter ${name} ? Les transactions importées sont conservées.`)) return;
    try {
      await api.banks.delete(id);
      await reload();
    } catch (e) {
      setSyncMessage({ kind: 'error', text: e.message });
    }
  };

  if (unavailable) {
    return (
      <section className="card">
        <div className="card-header"><h3><Link2 size={16}/> Connexions bancaires</h3></div>
        <div className="settings-info">
          <Lightbulb size={14}/>
          <span>
            La synchronisation bancaire automatique n'est pas activée sur ce backend. Configure
            <code style={{ margin: '0 4px' }}>GOCARDLESS_SECRET_ID</code> et
            <code style={{ margin: '0 4px' }}>GOCARDLESS_SECRET_KEY</code> côté Railway pour l'activer.
          </span>
        </div>
      </section>
    );
  }

  return (
    <section className="card">
      <div className="card-header">
        <h3><Link2 size={16}/> Connexions bancaires {loading && <RefreshCw size={12} className="spin" style={{marginLeft:6,opacity:.5}}/>}</h3>
        <button className="secondary-btn" onClick={() => setPicker(true)}><Plus size={14}/> Connecter une banque</button>
      </div>

      {syncMessage && (
        <div className="settings-info" style={{
          color: syncMessage.kind === 'error' ? 'var(--danger)' : syncMessage.kind === 'warn' ? 'var(--warning)' : 'var(--success)',
        }}>
          <AlertCircle size={14}/><span>{syncMessage.text}</span>
        </div>
      )}

      {connections.length === 0 && !loading && (
        <div className="empty-mini">
          <Link2 size={24}/>
          <p>Aucune banque connectée. Ajoute-en une pour recevoir tes transactions automatiquement.</p>
        </div>
      )}

      <div className="member-list">
        {connections.map((c) => {
          const expiringSoon = c.days_until_expiry !== null && c.days_until_expiry <= 7;
          const linkedCount = c.account_links.filter((l) => l.account_id).length;
          return (
            <div key={c.id} className="member-card" style={{ alignItems: 'flex-start' }}>
              <span className="member-avatar large" style={{ background: '#1f2026', overflow: 'hidden' }}>
                {c.institution_logo ? (
                  <img src={c.institution_logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/>
                ) : (c.institution_name || '?').charAt(0)}
              </span>
              <div className="member-card-info" style={{ flex: 1 }}>
                <div className="member-card-name">{c.institution_name}</div>
                <div className="member-card-role">
                  {linkedCount}/{c.account_links.length} compte{c.account_links.length > 1 ? 's' : ''} lié{linkedCount > 1 ? 's' : ''}
                  {' · '}
                  {c.last_sync_at ? `Synchro : ${new Date(c.last_sync_at).toLocaleString('fr-FR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' })}` : 'Jamais synchronisé'}
                  {' · '}
                  <span style={{ color: c.status === 'LN' ? 'var(--success)' : 'var(--warning)' }}>
                    {c.status_label}
                  </span>
                  {expiringSoon && (
                    <span style={{ color: 'var(--warning)' }}>
                      {' · expire dans '}{c.days_until_expiry}j
                    </span>
                  )}
                </div>
                {c.last_sync_error && (
                  <div className="member-card-role" style={{ color: 'var(--danger)', marginTop: 4 }}>
                    {c.last_sync_error}
                  </div>
                )}
              </div>
              <button
                className="icon-btn-sm"
                title="Synchroniser maintenant"
                onClick={() => handleSync(c.id)}
                disabled={syncingId === c.id || c.status !== 'LN'}
              >
                <RefreshCw size={13} className={syncingId === c.id ? 'spin' : ''}/>
              </button>
              <button className="icon-btn-sm" title="Déconnecter" onClick={() => handleDelete(c.id, c.institution_name)}>
                <Unlink size={13}/>
              </button>
            </div>
          );
        })}
      </div>

      <div className="settings-info" style={{ marginTop: 14 }}>
        <Lightbulb size={14}/>
        <span>
          Le consentement DSP2 dure <strong>90 jours</strong> max — à renouveler en re-connectant la banque. Les transactions sont catégorisées avec tes règles existantes.
        </span>
      </div>

      {picker && <InstitutionPicker onClose={() => setPicker(false)}/>}
    </section>
  );
}

function InstitutionPicker({ onClose }) {
  const [institutions, setInstitutions] = useState(null);
  const [filter, setFilter] = useState('');
  const [error, setError] = useState(null);
  const [connecting, setConnecting] = useState(null);

  useEffect(() => {
    (async () => {
      try {
        const list = await api.banks.listInstitutions('FR');
        setInstitutions(list || []);
      } catch (e) {
        setError(e.message);
      }
    })();
  }, []);

  const filtered = (institutions || []).filter((i) =>
    i.name.toLowerCase().includes(filter.toLowerCase())
  );

  const start = async (institutionId) => {
    setConnecting(institutionId);
    try {
      const res = await api.banks.connect(institutionId);
      // Hard navigation to the bank's auth page
      window.location.href = res.redirect_url;
    } catch (e) {
      setError(e.message);
      setConnecting(null);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 560 }}>
        <div className="modal-header">
          <h2>Connecter une banque</h2>
          <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
        </div>
        <div className="modal-body">
          {error && <div className="settings-info" style={{ color: 'var(--danger)' }}><AlertCircle size={14}/><span>{error}</span></div>}
          <label>
            <span>Rechercher</span>
            <input
              type="text"
              autoFocus
              placeholder="BNP, Boursorama, Revolut…"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
          </label>
          {!institutions && !error && <div className="empty-mini"><RefreshCw size={20} className="spin"/><p>Chargement des banques…</p></div>}
          {institutions && (
            <div className="member-list" style={{ maxHeight: 320, overflowY: 'auto', marginTop: 12 }}>
              {filtered.map((i) => (
                <button
                  key={i.id}
                  className="member-card"
                  onClick={() => start(i.id)}
                  disabled={connecting === i.id}
                  style={{ cursor: 'pointer', textAlign: 'left', background: 'transparent', border: '1px solid var(--border)' }}
                >
                  <span className="member-avatar large" style={{ background: '#1f2026', overflow: 'hidden' }}>
                    {i.logo ? <img src={i.logo} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }}/> : i.name.charAt(0)}
                  </span>
                  <div className="member-card-info">
                    <div className="member-card-name">{i.name}</div>
                    {i.bic && <div className="member-card-role">{i.bic}</div>}
                  </div>
                  {connecting === i.id && <RefreshCw size={14} className="spin"/>}
                </button>
              ))}
              {filtered.length === 0 && <p style={{ color: 'var(--text-muted)', textAlign: 'center', padding: 16 }}>Aucune banque pour ce filtre.</p>}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function MemberEditor({ member, onSave, onCancel }) {
  const [draft, setDraft] = useState(member);
  const COLORS = MEMBER_PALETTE;
  return (
    <div className="modal-backdrop" onClick={onCancel}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>{member.id ? 'Modifier le membre' : 'Nouveau membre'}</h2>
          <button className="icon-btn-sm" onClick={onCancel}><X size={16}/></button>
        </div>
        <div className="modal-body">
          <label><span>Prénom</span><input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })}/></label>
          <label><span>Rôle</span>
            <select value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value })}>
              <option value="adult">Adulte</option>
              <option value="child">Enfant</option>
            </select>
          </label>
          <label><span>Couleur</span>
            <div className="color-picker">
              {COLORS.map(c => (
                <button key={c} className={`color-dot ${draft.color === c ? 'active' : ''}`} style={{ background: c }} onClick={() => setDraft({ ...draft, color: c })}/>
              ))}
            </div>
          </label>
        </div>
        <div className="modal-footer">
          <button className="secondary-btn" onClick={onCancel}>Annuler</button>
          <button className="primary-btn" onClick={() => { if (draft.name) onSave(draft); }}><Check size={14}/> Enregistrer</button>
        </div>
      </div>
    </div>
  );
}
