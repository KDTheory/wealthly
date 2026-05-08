import React, { useEffect, useState } from 'react';
import { banks, accounts as accountsApi, members as membersApi } from './api.js';

/**
 * Landing page after the user authenticates with their bank on GoCardless.
 *
 * URL shape: /bank-callback?ref=<reference>[&error=<...>]
 *
 * 1. Reads the reference, calls /banks/callback to materialize the link
 *    and discover the external accounts.
 * 2. Renders a mapping screen — one row per remote account, with the choice
 *    between "lier à un compte existant" and "créer un nouveau compte".
 * 3. Submits the mapping → backend triggers a first sync → redirect home.
 */
export default function BankCallback({ onDone }) {
  const [phase, setPhase] = useState('loading'); // loading | mapping | submitting | done | error
  const [error, setError] = useState(null);
  const [callback, setCallback] = useState(null);
  const [internalAccounts, setInternalAccounts] = useState([]);
  const [internalMembers, setInternalMembers] = useState([]);
  const [mappingChoices, setMappingChoices] = useState({}); // ext_id -> { mode, account_id, name, type, member_ids }

  useEffect(() => {
    (async () => {
      const params = new URLSearchParams(window.location.search);
      const ref = params.get('ref');
      const errParam = params.get('error');
      if (errParam) {
        setError(`Connexion refusée par la banque (${errParam}).`);
        setPhase('error');
        return;
      }
      if (!ref) {
        setError('Référence manquante. Relance la connexion depuis Réglages.');
        setPhase('error');
        return;
      }
      try {
        const [cb, accs, mems] = await Promise.all([
          banks.callback(ref),
          accountsApi.list(),
          membersApi.list(),
        ]);
        setCallback(cb);
        setInternalAccounts(accs || []);
        setInternalMembers(mems || []);
        // Initialize mapping choices: prefer suggested existing account,
        // otherwise propose a new account named after the remote display name.
        const init = {};
        for (const acc of cb.accounts) {
          if (acc.suggested_account_id) {
            init[acc.external_account_id] = { mode: 'existing', account_id: acc.suggested_account_id };
          } else {
            init[acc.external_account_id] = {
              mode: 'new',
              name: acc.display_name || cb.institution_name,
              type: 'checking',
              member_ids: [],
            };
          }
        }
        setMappingChoices(init);
        setPhase(cb.status === 'LN' ? 'mapping' : 'error');
        if (cb.status !== 'LN') {
          setError(`Statut de la connexion : ${cb.status}. La banque n'a pas finalisé l'autorisation.`);
        }
      } catch (e) {
        setError(e.message || 'Erreur lors de la récupération de la connexion.');
        setPhase('error');
      }
    })();
  }, []);

  const submit = async () => {
    setPhase('submitting');
    try {
      const mappings = (callback?.accounts || [])
        .map((acc) => {
          const ch = mappingChoices[acc.external_account_id];
          if (!ch) return null;
          if (ch.mode === 'ignore') return null;
          if (ch.mode === 'existing' && ch.account_id) {
            return { external_account_id: acc.external_account_id, account_id: ch.account_id };
          }
          if (ch.mode === 'new' && ch.name) {
            return {
              external_account_id: acc.external_account_id,
              new_account_name: ch.name,
              new_account_type: ch.type || 'checking',
              new_account_member_ids: ch.member_ids || [],
            };
          }
          return null;
        })
        .filter(Boolean);

      await banks.map(callback.connection_id, mappings);
      setPhase('done');
      // Strip the URL and bounce home after a short pause so the user sees the success
      setTimeout(() => {
        window.history.replaceState({}, '', '/');
        if (onDone) onDone();
      }, 1200);
    } catch (e) {
      setError(e.message || 'Erreur lors du mapping.');
      setPhase('error');
    }
  };

  const wrap = (children) => (
    <div style={shell}>
      <div style={card}>{children}</div>
    </div>
  );

  if (phase === 'loading') return wrap(<p style={muted}>Récupération de ta connexion…</p>);

  if (phase === 'error') {
    return wrap(
      <>
        <h2 style={title}>Connexion bancaire</h2>
        <p style={errorText}>{error}</p>
        <button style={primaryBtn} onClick={() => { window.history.replaceState({}, '', '/'); onDone && onDone(); }}>
          Retour
        </button>
      </>
    );
  }

  if (phase === 'done') {
    return wrap(
      <>
        <h2 style={title}>Connexion établie</h2>
        <p style={muted}>Tes transactions arrivent — tu seras redirigé dans un instant.</p>
      </>
    );
  }

  // mapping / submitting
  return wrap(
    <>
      <h2 style={title}>Lier les comptes — {callback.institution_name}</h2>
      <p style={muted}>
        Choisis pour chaque compte distant s'il correspond à un compte Wealthly existant ou s'il faut en créer un nouveau.
        Les transactions des 90 derniers jours seront importées dès la validation.
      </p>

      <div style={{ display: 'grid', gap: 14, marginTop: 18 }}>
        {callback.accounts.map((acc) => {
          const ch = mappingChoices[acc.external_account_id] || {};
          return (
            <div key={acc.external_account_id} style={accountRow}>
              <div style={{ marginBottom: 8 }}>
                <strong style={{ color: 'var(--text-primary, #ebe8e3)' }}>
                  {acc.display_name || 'Compte'} {acc.iban ? `· ${acc.iban}` : ''}
                </strong>
                {acc.owner_name && <div style={{ ...muted, fontSize: 12 }}>{acc.owner_name}</div>}
              </div>

              <div style={radioRow}>
                <label style={radio}>
                  <input
                    type="radio"
                    checked={ch.mode === 'existing'}
                    onChange={() => setMappingChoices((m) => ({
                      ...m,
                      [acc.external_account_id]: { mode: 'existing', account_id: acc.suggested_account_id || (internalAccounts[0]?.id ?? null) },
                    }))}
                  />
                  Lier à un compte existant
                </label>
                <label style={radio}>
                  <input
                    type="radio"
                    checked={ch.mode === 'new'}
                    onChange={() => setMappingChoices((m) => ({
                      ...m,
                      [acc.external_account_id]: {
                        mode: 'new',
                        name: acc.display_name || callback.institution_name,
                        type: 'checking',
                        member_ids: [],
                      },
                    }))}
                  />
                  Créer un nouveau compte
                </label>
                <label style={radio}>
                  <input
                    type="radio"
                    checked={ch.mode === 'ignore'}
                    onChange={() => setMappingChoices((m) => ({ ...m, [acc.external_account_id]: { mode: 'ignore' } }))}
                  />
                  Ignorer
                </label>
              </div>

              {ch.mode === 'existing' && (
                <select
                  value={ch.account_id || ''}
                  onChange={(e) => setMappingChoices((m) => ({
                    ...m,
                    [acc.external_account_id]: { ...m[acc.external_account_id], account_id: e.target.value },
                  }))}
                  style={input}
                >
                  <option value="">— sélectionner —</option>
                  {internalAccounts.map((a) => (
                    <option key={a.id} value={a.id}>{a.name} {a.bank ? `(${a.bank})` : ''}</option>
                  ))}
                </select>
              )}

              {ch.mode === 'new' && (
                <div style={{ display: 'grid', gap: 8, gridTemplateColumns: '2fr 1fr' }}>
                  <input
                    type="text"
                    placeholder="Nom du compte"
                    value={ch.name || ''}
                    onChange={(e) => setMappingChoices((m) => ({
                      ...m,
                      [acc.external_account_id]: { ...m[acc.external_account_id], name: e.target.value },
                    }))}
                    style={input}
                  />
                  <select
                    value={ch.type || 'checking'}
                    onChange={(e) => setMappingChoices((m) => ({
                      ...m,
                      [acc.external_account_id]: { ...m[acc.external_account_id], type: e.target.value },
                    }))}
                    style={input}
                  >
                    <option value="checking">Courant</option>
                    <option value="savings">Épargne</option>
                    <option value="pea">PEA</option>
                    <option value="credit">Crédit</option>
                  </select>
                  {internalMembers.length > 0 && (
                    <div style={{ gridColumn: '1 / -1', display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                      {internalMembers.map((m) => {
                        const checked = (ch.member_ids || []).includes(m.id);
                        return (
                          <label key={m.id} style={{ ...radio, padding: '4px 10px' }}>
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={() => setMappingChoices((s) => ({
                                ...s,
                                [acc.external_account_id]: {
                                  ...s[acc.external_account_id],
                                  member_ids: checked
                                    ? (s[acc.external_account_id].member_ids || []).filter((x) => x !== m.id)
                                    : [...(s[acc.external_account_id].member_ids || []), m.id],
                                },
                              }))}
                            />
                            {m.name}
                          </label>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div style={{ marginTop: 24, display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
        <button style={ghostBtn} onClick={() => { window.history.replaceState({}, '', '/'); onDone && onDone(); }}>
          Plus tard
        </button>
        <button style={primaryBtn} disabled={phase === 'submitting'} onClick={submit}>
          {phase === 'submitting' ? 'Synchronisation…' : 'Valider et synchroniser'}
        </button>
      </div>
    </>
  );
}

const shell = {
  minHeight: '100vh',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: '#0c0d10',
  padding: 24,
  fontFamily: 'Inter, system-ui, sans-serif',
};

const card = {
  width: '100%',
  maxWidth: 720,
  background: '#15171c',
  border: '1px solid #25272d',
  borderRadius: 16,
  padding: 32,
  color: '#ebe8e3',
};

const title = { fontFamily: "'Source Serif 4', 'Source Serif Pro', Georgia, serif", fontSize: 28, fontWeight: 400, marginBottom: 12, letterSpacing: '-0.018em', lineHeight: 1.1 };
const muted = { color: '#8c8a85', fontSize: 14, lineHeight: 1.5 };
const errorText = { color: '#c47158', fontSize: 14, marginBottom: 16 };

const accountRow = {
  background: '#0f1116',
  border: '1px solid #25272d',
  borderRadius: 12,
  padding: 16,
};

const radioRow = { display: 'flex', flexWrap: 'wrap', gap: 12, marginBottom: 8 };
const radio = {
  display: 'inline-flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 13,
  color: '#c7c4be',
  cursor: 'pointer',
  padding: '6px 10px',
  border: '1px solid #25272d',
  borderRadius: 8,
};
const input = {
  background: '#0c0d10',
  border: '1px solid #25272d',
  borderRadius: 8,
  padding: '8px 10px',
  color: '#ebe8e3',
  fontSize: 13,
  fontFamily: 'inherit',
  width: '100%',
  boxSizing: 'border-box',
};
const primaryBtn = {
  background: '#c5a572',
  color: '#0c0d10',
  border: 'none',
  padding: '10px 16px',
  borderRadius: 8,
  fontSize: 13,
  fontWeight: 600,
  cursor: 'pointer',
};
const ghostBtn = {
  background: 'transparent',
  color: '#c7c4be',
  border: '1px solid #25272d',
  padding: '10px 16px',
  borderRadius: 8,
  fontSize: 13,
  cursor: 'pointer',
};
