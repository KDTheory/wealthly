/**
 * BankConnectModal — Enable Banking open banking flow
 *
 * 1. User picks a country
 * 2. Component fetches the list of banks from /banking/banks
 * 3. User picks a bank → POST /banking/connect → redirected to bank login
 * 4. After bank OAuth, the app URL gets ?state=xxx and WealthlyApp detects it
 */
import { useState } from 'react';
import { Plus, X, ChevronRight } from 'lucide-react';
import * as api from '../api.js';

const COUNTRIES = [
  { code: 'FR', name: '🇫🇷 France' },
  { code: 'DE', name: '🇩🇪 Allemagne' },
  { code: 'ES', name: '🇪🇸 Espagne' },
  { code: 'IT', name: '🇮🇹 Italie' },
  { code: 'BE', name: '🇧🇪 Belgique' },
  { code: 'NL', name: '🇳🇱 Pays-Bas' },
  { code: 'PT', name: '🇵🇹 Portugal' },
  { code: 'GB', name: '🇬🇧 Royaume-Uni' },
];

export function BankConnectModal({ onClose }) {
  const [step, setStep] = useState('country');
  const [country, setCountry] = useState('FR');
  const [banks, setBanks] = useState([]);
  const [loadingBanks, setLoadingBanks] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [error, setError] = useState(null);
  const [search, setSearch] = useState('');

  const loadBanks = async () => {
    setLoadingBanks(true);
    setError(null);
    try {
      const data = await api.banking.listBanks(country);
      const list = data.banks || data || [];
      setBanks(Array.isArray(list) ? list : []);
      setStep('list');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoadingBanks(false);
    }
  };

  const connectBank = async (bankName) => {
    setConnecting(true);
    setError(null);
    try {
      const result = await api.banking.connect(bankName, country);
      if (result.redirect_url) {
        window.location.href = result.redirect_url;
      } else {
        setError("Pas d'URL de redirection reçue");
        setConnecting(false);
      }
    } catch (err) {
      setError(err.message);
      setConnecting(false);
    }
  };

  const filteredBanks = banks.filter(b =>
    (b.name || b.full_name || '').toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" style={{ maxWidth: 480 }} onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>🏦 Connecter ma banque</h2>
          <button className="icon-btn-sm" onClick={onClose}><X size={16}/></button>
        </div>

        {step === 'country' && (
          <div className="modal-body">
            <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              Connexion sécurisée via <strong>Enable Banking</strong> (PSD2). Vos identifiants restent sur le site de votre banque — Wealthly ne les voit jamais.
            </p>
            <label>
              <span>Pays de votre banque</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                {COUNTRIES.map(c => <option key={c.code} value={c.code}>{c.name}</option>)}
              </select>
            </label>
            {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
            <div className="modal-footer">
              <button className="secondary-btn" onClick={onClose}>Annuler</button>
              <button className="primary-btn" onClick={loadBanks} disabled={loadingBanks}>
                {loadingBanks ? '⏳ Chargement…' : 'Voir les banques →'}
              </button>
            </div>
          </div>
        )}

        {step === 'list' && (
          <div className="modal-body">
            <input
              className="search-input"
              placeholder="Chercher votre banque…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              style={{ width: '100%', marginBottom: 12 }}
              autoFocus
            />
            <div style={{ maxHeight: 320, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 6 }}>
              {filteredBanks.length === 0 && (
                <div style={{ padding: 20, textAlign: 'center', color: 'var(--text-tertiary)', fontSize: 13 }}>
                  {banks.length === 0 ? 'Aucune banque disponible pour ce pays' : 'Aucun résultat'}
                </div>
              )}
              {filteredBanks.map((bank, idx) => {
                const bankName = bank.name || bank.full_name || `Banque ${idx}`;
                return (
                  <button
                    key={idx}
                    className="bank-option-btn"
                    onClick={() => connectBank(bankName)}
                    disabled={connecting}
                  >
                    <span className="bank-initial">{bankName.charAt(0).toUpperCase()}</span>
                    <span className="bank-option-name">{bankName}</span>
                    {connecting ? <span style={{ fontSize: 11, color: 'var(--text-tertiary)' }}>⏳</span> : <ChevronRight size={14}/>}
                  </button>
                );
              })}
            </div>
            {error && <div className="error-banner" style={{ marginTop: 10 }}>{error}</div>}
            <div style={{ marginTop: 12 }}>
              <button className="secondary-btn" style={{ width: '100%' }} onClick={() => setStep('country')}>
                ← Changer de pays
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
