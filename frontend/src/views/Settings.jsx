// ============================================================================
// Settings — household, accounts, custom rules, bank connections, data tools
//
// Bundles SettingsView + the 4 sub-components it owns: CustomRulesSection,
// BankConnectionsSection, InstitutionPicker (modal), MemberEditor (modal).
// All read/write through the api module; the parent only passes data + a few
// CRUD callbacks.
// ============================================================================
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus, Trash2, Edit3, Check, Upload, Download, Users, Wallet,
  Lightbulb, Sparkles, Activity, AlertCircle, RefreshCw, Link2, Unlink, X, Cloud,
} from 'lucide-react';
import { useTranslation } from 'react-i18next';
import * as api from '../api.js';
import { MEMBER_PALETTE } from '../constants.js';
import { ACCOUNT_ROLES, ACCOUNT_ROLE_KEYS, suggestAccountRole, SUPPORTED_CURRENCIES } from '../utils.js';
import { BankConnectModal } from '../components/BankConnectModal.jsx';

const CURRENCY_FLAGS = { EUR: '🇪🇺', USD: '🇺🇸', GBP: '🇬🇧', CHF: '🇨🇭' };
const CURRENCY_NAMES = { EUR: 'Euro', USD: 'Dollar US', GBP: 'Livre sterling', CHF: 'Franc suisse' };

// ============================================================================
// SETTINGS
// ============================================================================
export function SettingsView({ members, accounts, accountBalances, saveMember, deleteMember, deleteAccount, updateAccount, transactions = [], exportData, importData, resetAllData, categories = [], fmt, baseCurrency = 'EUR', setBaseCurrency, rates, ratesDate }) {
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

      {/* === Devise d'affichage === */}
      <section className="card">
        <div className="card-header">
          <h3>💱 Devise d'affichage</h3>
          <span className="card-meta">les montants seront convertis en temps réel à partir des taux du jour</span>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', padding: '4px 0 8px' }}>
          {SUPPORTED_CURRENCIES.map(c => {
            const active = c === baseCurrency;
            return (
              <button
                key={c}
                onClick={() => setBaseCurrency && setBaseCurrency(c)}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 10,
                  padding: '12px 18px',
                  background: active ? 'var(--primary-soft)' : 'var(--bg-card)',
                  border: `1px solid ${active ? 'var(--primary)' : 'var(--border)'}`,
                  borderRadius: 12,
                  cursor: 'pointer',
                  color: active ? 'var(--primary-text)' : 'var(--text-primary)',
                  fontWeight: active ? 600 : 500,
                  fontFamily: 'inherit', fontSize: 13.5,
                  transition: 'all .12s',
                  boxShadow: active ? '0 0 0 4px rgba(59,111,224,0.10)' : 'none',
                }}
              >
                <span style={{ fontSize: 18 }}>{CURRENCY_FLAGS[c]}</span>
                <span>
                  <div style={{ fontWeight: 700, lineHeight: 1.1 }}>{c}</div>
                  <div style={{ fontSize: 11, color: 'var(--text-tertiary)', marginTop: 2 }}>{CURRENCY_NAMES[c]}</div>
                </span>
              </button>
            );
          })}
        </div>
        {rates && (
          <div style={{ marginTop: 12, padding: '12px 14px', background: 'var(--bg-subtle)', borderRadius: 10, border: '1px solid var(--border-light)' }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.06em', color: 'var(--text-tertiary)', marginBottom: 6 }}>
              Taux du jour {ratesDate && `· ${ratesDate}`}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 18, fontSize: 13, fontVariantNumeric: 'tabular-nums' }}>
              <div><strong>1 €</strong> = {rates.USD?.toFixed(4)} $</div>
              <div><strong>1 €</strong> = {rates.GBP?.toFixed(4)} £</div>
              <div><strong>1 €</strong> = {rates.CHF?.toFixed(4)} CHF</div>
            </div>
            <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 8 }}>Source : Frankfurter (BCE) · cache 1h</div>
          </div>
        )}
      </section>

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
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
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
                    <select
                      value={a.currency || 'EUR'}
                      onChange={(e) => updateAccount(a.id, { currency: e.target.value })}
                      title="Devise du compte"
                      style={{ fontSize: 11.5, padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'var(--bg-subtle)', color: 'var(--text-secondary)', cursor: 'pointer', maxWidth: 200 }}
                    >
                      {SUPPORTED_CURRENCIES.map(c => (
                        <option key={c} value={c}>{CURRENCY_FLAGS[c]} {c}</option>
                      ))}
                    </select>
                  </div>
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
  const [picker, setPicker] = useState(false);
  const [syncingId, setSyncingId] = useState(null);
  const [syncMessage, setSyncMessage] = useState(null);

  const reload = useCallback(async () => {
    setLoading(true);
    try {
      const list = await api.banking.listConnections();
      setConnections(list || []);
    } catch (e) {
      setSyncMessage({ kind: 'error', text: e.message });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { reload(); }, [reload]);

  const handleSync = async (id) => {
    setSyncingId(id);
    setSyncMessage(null);
    try {
      const res = await api.banking.sync(id);
      setSyncMessage({
        kind: res.errors?.length ? 'warn' : 'ok',
        text: res.errors?.length
          ? `${res.imported} importées · ${res.skipped} ignorées · erreurs : ${res.errors.join(', ')}`
          : `✅ ${res.imported} nouvelle${res.imported > 1 ? 's' : ''} transaction${res.imported > 1 ? 's' : ''}, ${res.skipped} ignorée${res.skipped > 1 ? 's' : ''}`,
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
      await api.banking.deleteConnection(id);
      await reload();
    } catch (e) {
      setSyncMessage({ kind: 'error', text: e.message });
    }
  };

  return (
    <section className="card">
      <div className="card-header">
        <h3><Cloud size={16}/> Synchro bancaire (Enable Banking) {loading && <RefreshCw size={12} className="spin" style={{marginLeft:6,opacity:.5}}/>}</h3>
        <button className="primary-btn" style={{ fontSize: 12, padding: '6px 14px' }} onClick={() => setPicker(true)}>
          <Plus size={13}/> Connecter une banque
        </button>
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
          <Cloud size={24}/>
          <p>Aucune banque connectée. Connectez votre banque pour importer les transactions automatiquement.</p>
          <button className="primary-btn" style={{ marginTop: 8 }} onClick={() => setPicker(true)}>
            Connecter ma banque
          </button>
        </div>
      )}

      <div className="member-list">
        {connections.map((c) => (
          <div key={c.id} className="member-card">
            <span className="member-avatar large" style={{
              background: c.status === 'authorized' ? '#10b981' : c.status === 'error' ? '#ef4444' : '#f59e0b',
            }}>
              {c.bank_name.charAt(0)}
            </span>
            <div className="member-card-info" style={{ flex: 1 }}>
              <div className="member-card-name">{c.bank_name}</div>
              <div className="member-card-role">
                {c.status === 'authorized' ? '✅ Connecté' : c.status === 'error' ? '❌ Erreur' : '⏳ En attente'}
                {c.last_synced_at && ` · Synchro ${new Date(c.last_synced_at).toLocaleDateString('fr-FR')}`}
                {c.accounts?.length > 0 && ` · ${c.accounts.length} compte(s)`}
              </div>
              {c.error_message && (
                <div style={{ fontSize: 11, color: 'var(--danger-text)', marginTop: 2 }}>{c.error_message}</div>
              )}
            </div>
            {c.status === 'authorized' && (
              <button
                className="secondary-btn"
                style={{ fontSize: 11, padding: '5px 10px', whiteSpace: 'nowrap' }}
                onClick={() => handleSync(c.id)}
                disabled={syncingId === c.id}
              >
                <RefreshCw size={12} className={syncingId === c.id ? 'spin' : ''}/> Sync
              </button>
            )}
            <button className="icon-btn-sm" title="Déconnecter" onClick={() => handleDelete(c.id, c.bank_name)}>
              <Unlink size={13}/>
            </button>
          </div>
        ))}
      </div>

      <div className="settings-info" style={{ marginTop: 14 }}>
        <Lightbulb size={14}/>
        <span>
          Connexion sécurisée via <strong>Enable Banking</strong> (PSD2 open banking). Vos identifiants bancaires ne transitent pas par Wealthly.
        </span>
      </div>

      {picker && <BankConnectModal onClose={() => { setPicker(false); reload(); }}/>}
    </section>
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
