// ============================================================================
// ImportFlow — 4-step CSV import wizard (upload → mapping → preview → done)
//
// State machine lives upstream in WealthlyApp; this view just renders the
// current step and emits the navigation callbacks. MappingField is local —
// only used by the mapping step.
// ============================================================================
import { Upload, Check, ChevronRight, Sparkles, Lightbulb } from 'lucide-react';
import { formatDate } from '../utils.js';

// ============================================================================
// IMPORT FLOW
// ============================================================================
export function ImportFlow({ step, parsedData, mapping, setMapping, account, setAccount, preview, categories, members, existingAccounts, knownMappings, detectedBank, handleFileUpload, proceedToAccountStep, proceedToPreview, confirmImport, cancelImport, setStep, fmt }) {
  if (step === 'upload') {
    return (
      <div className="import-flow">
        <div className="import-header">
          <h2>Importer un <em>relevé CSV</em></h2>
          <p>Glissez votre fichier ou cliquez pour le sélectionner</p>
        </div>
        <label className="upload-zone">
          <input type="file" accept=".csv,.txt,.tsv" onChange={handleFileUpload} style={{ display: 'none' }}/>
          <div className="upload-icon"><Upload size={36}/></div>
          <span className="upload-main">Choisir un fichier CSV</span>
          <span className="upload-sub">Détection auto Revolut, Crédit Agricole, Boursorama et autres</span>
        </label>
        <div className="import-tips">
          <Lightbulb size={14}/>
          <span><strong>Crédit Agricole :</strong> exportez en PDF puis convertissez via OFXpress.fr ou BankStatementLab. Le CSV natif est instable.</span>
        </div>
      </div>
    );
  }
  if (step === 'mapping') {
    return (
      <div className="import-flow">
        <div className="import-header">
          <div className="import-progress">
            <span className="step active"><div className="step-num">1</div>Colonnes</span>
            <span className="step"><div className="step-num">2</div>Compte</span>
            <span className="step"><div className="step-num">3</div>Aperçu</span>
          </div>
          <h2>Vérifiez <em>le mapping</em></h2>
          <p>{parsedData?.rows.length} lignes détectées · délimiteur "{parsedData?.delimiter === '\t' ? 'TAB' : parsedData?.delimiter}"</p>
          {detectedBank && (
            <div className="detection-badge">
              <Sparkles size={14}/> Format <strong>{detectedBank.profile.name}</strong> détecté — mapping pré-rempli
            </div>
          )}
        </div>
        <div className="mapping-grid">
          <MappingField label="Date *" required value={mapping.date} onChange={(v) => setMapping({ ...mapping, date: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Libellé" value={mapping.label} onChange={(v) => setMapping({ ...mapping, label: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Montant signé" value={mapping.amount} onChange={(v) => setMapping({ ...mapping, amount: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Débit séparé" value={mapping.debit} onChange={(v) => setMapping({ ...mapping, debit: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Crédit séparé" value={mapping.credit} onChange={(v) => setMapping({ ...mapping, credit: v })} headers={parsedData?.headers || []}/>
          <MappingField label="Solde (optionnel)" value={mapping.balance} onChange={(v) => setMapping({ ...mapping, balance: v })} headers={parsedData?.headers || []}/>
        </div>
        <div className="csv-preview">
          <strong>Aperçu :</strong>
          <table>
            <thead><tr>{parsedData?.headers.map(h => <th key={h}>{h}</th>)}</tr></thead>
            <tbody>{parsedData?.rows.slice(0, 4).map((r, i) => <tr key={i}>{parsedData.headers.map(h => <td key={h}>{r[h]}</td>)}</tr>)}</tbody>
          </table>
        </div>
        <div className="flow-actions">
          <button className="secondary-btn" onClick={cancelImport}>Annuler</button>
          <button className="primary-btn" onClick={proceedToAccountStep}>Suivant <ChevronRight size={14}/></button>
        </div>
      </div>
    );
  }
  if (step === 'account') {
    const toggleMember = (mid) => {
      const ids = account.memberIds || [];
      setAccount({ ...account, memberIds: ids.includes(mid) ? ids.filter(i => i !== mid) : [...ids, mid] });
    };
    return (
      <div className="import-flow">
        <div className="import-header">
          <div className="import-progress">
            <span className="step done"><div className="step-num"><Check size={11}/></div>Colonnes</span>
            <span className="step active"><div className="step-num">2</div>Compte</span>
            <span className="step"><div className="step-num">3</div>Aperçu</span>
          </div>
          <h2>À quel <em>compte</em> appartiennent ces transactions ?</h2>
        </div>
        <div className="account-form">
          <label><span>Banque</span>
            <select value={account.bank} onChange={(e) => setAccount({ ...account, bank: e.target.value })}>
              <option value="">Choisir…</option>
              <option>Crédit Agricole</option><option>Revolut</option><option>Boursorama</option>
              <option>BNP Paribas</option><option>Société Générale</option><option>LCL</option>
              <option>Crédit Mutuel</option><option>Caisse d'Épargne</option><option>La Banque Postale</option>
              <option>N26</option><option>HSBC</option><option>Fortuneo</option><option>Hello bank!</option><option>Autre</option>
            </select>
          </label>
          <label><span>Nom du compte</span>
            <input value={account.name} onChange={(e) => setAccount({ ...account, name: e.target.value })} placeholder="ex: Compte courant principal" list="known-accounts"/>
            <datalist id="known-accounts">{existingAccounts.map(a => <option key={a.id} value={a.name}/>)}</datalist>
          </label>
          <label><span>Type</span>
            <select value={account.type} onChange={(e) => setAccount({ ...account, type: e.target.value })}>
              <option value="checking">Compte courant</option>
              <option value="savings">Livret / épargne</option>
              <option value="pea">PEA / Bourse</option>
              <option value="credit">Carte de crédit</option>
            </select>
          </label>
          <label><span>Propriétaires <span className="hint">(plusieurs = compte joint)</span></span>
            <div className="member-checks">
              {members.map(m => (
                <label key={m.id} className={`member-check ${(account.memberIds || []).includes(m.id) ? 'active' : ''}`} style={{ borderColor: (account.memberIds || []).includes(m.id) ? m.color : undefined }}>
                  <input type="checkbox" checked={(account.memberIds || []).includes(m.id)} onChange={() => toggleMember(m.id)}/>
                  <span className="member-avatar" style={{ background: m.color }}>{m.name.charAt(0).toUpperCase()}</span>
                  <span>{m.name}</span>
                </label>
              ))}
            </div>
          </label>
          <label><span>Solde initial (optionnel)</span>
            <input type="number" value={account.initialBalance} onChange={(e) => setAccount({ ...account, initialBalance: e.target.value })} placeholder="0"/>
          </label>
        </div>
        <div className="flow-actions">
          <button className="secondary-btn" onClick={() => setStep('mapping')}>Retour</button>
          <button className="primary-btn" onClick={proceedToPreview}>Aperçu <ChevronRight size={14}/></button>
        </div>
      </div>
    );
  }
  if (step === 'preview') {
    const total = preview.reduce((s, t) => s + t.amount, 0);
    return (
      <div className="import-flow">
        <div className="import-header">
          <div className="import-progress">
            <span className="step done"><div className="step-num"><Check size={11}/></div>Colonnes</span>
            <span className="step done"><div className="step-num"><Check size={11}/></div>Compte</span>
            <span className="step active"><div className="step-num">3</div>Aperçu</span>
          </div>
          <h2>Vérification <em>avant import</em></h2>
          <p><strong>{preview.length}</strong> transactions vers <strong>{account.name}</strong> · Net : <strong>{fmt(total, { sign: true })}</strong></p>
        </div>
        <div className="preview-list">
          {preview.slice(0, 30).map(tx => {
            const cat = categories.find(c => c.id === tx.categoryId);
            return (
              <div key={tx.id} className="preview-row">
                <span className="prev-date">{formatDate(tx.date)}</span>
                <span className="prev-label">
                  {tx.label}
                  {tx.aiCategorized && <span className="ai-badge" title="Catégorisé par IA">✨</span>}
                </span>
                <span className="prev-cat" style={{ background: (cat?.color || '#999') + '22', color: cat?.color }}>{cat?.icon} {cat?.name}</span>
                <span className={`prev-amount ${tx.amount >= 0 ? 'positive' : ''}`}>{fmt(tx.amount, { sign: true })}</span>
              </div>
            );
          })}
          {preview.length > 30 && <div className="preview-more">+ {preview.length - 30} autres</div>}
        </div>
        <div className="flow-actions">
          <button className="secondary-btn" onClick={() => setStep('account')}>Retour</button>
          <button className="primary-btn" onClick={confirmImport}><Check size={14}/> Confirmer l'import</button>
        </div>
      </div>
    );
  }
  return null;
}

function MappingField({ label, value, onChange, headers, required }) {
  return (
    <label className={`mapping-field ${required ? 'required' : ''}`}>
      <span className="mapping-label">{label}</span>
      <select value={value || ''} onChange={(e) => onChange(e.target.value || null)}>
        <option value="">— Aucune —</option>
        {headers.map(h => <option key={h} value={h}>{h}</option>)}
      </select>
    </label>
  );
}

