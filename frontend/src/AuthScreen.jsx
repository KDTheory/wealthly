import React, { useState } from 'react';
import { Sparkles, Mail, Lock, User, Home, Eye, EyeOff, AlertCircle } from 'lucide-react';
import { auth, setToken } from './api.js';

export default function AuthScreen({ onAuth }) {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const result = mode === 'login'
        ? await auth.login(email, password)
        : await auth.register(email, password, fullName, householdName || 'Mon foyer');
      setToken(result.access_token);
      onAuth();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-bg-mesh" />
      <div className="auth-card">
        <div className="auth-brand">
          <div className="auth-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" width="32" height="32">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h1>Wealthly</h1>
          <p>Smart family finance</p>
        </div>

        <div className="auth-tabs">
          <button
            className={mode === 'login' ? 'active' : ''}
            onClick={() => { setMode('login'); setError(null); }}
            type="button"
          >Connexion</button>
          <button
            className={mode === 'register' ? 'active' : ''}
            onClick={() => { setMode('register'); setError(null); }}
            type="button"
          >Créer un compte</button>
        </div>

        <form onSubmit={submit} className="auth-form">
          {mode === 'register' && (
            <>
              <label className="auth-field">
                <span><User size={14} /> Votre prénom</span>
                <input
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="ex : Antoine"
                  required
                  autoFocus
                />
              </label>
              <label className="auth-field">
                <span><Home size={14} /> Nom du foyer (optionnel)</span>
                <input
                  type="text"
                  value={householdName}
                  onChange={(e) => setHouseholdName(e.target.value)}
                  placeholder="ex : Famille Dupont"
                />
              </label>
            </>
          )}

          <label className="auth-field">
            <span><Mail size={14} /> Email</span>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="vous@exemple.fr"
              required
              autoFocus={mode === 'login'}
            />
          </label>

          <label className="auth-field">
            <span><Lock size={14} /> Mot de passe</span>
            <div className="password-input">
              <input
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={mode === 'register' ? 'Au moins 8 caractères' : '••••••••'}
                minLength={mode === 'register' ? 8 : undefined}
                required
              />
              <button
                type="button"
                className="pwd-toggle"
                onClick={() => setShowPwd(!showPwd)}
                aria-label="Afficher / masquer le mot de passe"
              >
                {showPwd ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </label>

          {error && (
            <div className="auth-error">
              <AlertCircle size={14} /> {error}
            </div>
          )}

          <button type="submit" className="auth-submit" disabled={loading}>
            {loading ? 'Patientez…' : (mode === 'login' ? 'Se connecter' : 'Créer mon compte')}
          </button>
        </form>

        <div className="auth-footer">
          {mode === 'login' ? (
            <span>Pas encore de compte ? <a onClick={() => setMode('register')}>Créer un compte</a></span>
          ) : (
            <span>Déjà inscrit ? <a onClick={() => setMode('login')}>Se connecter</a></span>
          )}
        </div>

        <div className="auth-features">
          <div className="auth-feature"><Sparkles size={14} /> 100% auto-hébergé · vos données chez vous</div>
        </div>
      </div>

      <style>{authStyles}</style>
    </div>
  );
}

const authStyles = `
.auth-screen {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: #fafbfc;
  padding: 24px;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  position: relative; overflow: hidden;
  -webkit-font-smoothing: antialiased;
}
.auth-bg-mesh {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(circle at 20% 20%, rgba(59,130,246,0.15), transparent 40%),
    radial-gradient(circle at 80% 80%, rgba(139,92,246,0.12), transparent 40%),
    radial-gradient(circle at 50% 50%, rgba(236,72,153,0.06), transparent 50%);
}
.auth-card {
  background: white;
  border-radius: 24px;
  padding: 40px;
  max-width: 440px;
  width: 100%;
  box-shadow: 0 24px 48px -12px rgba(0,0,0,0.12), 0 0 0 1px rgba(0,0,0,0.04);
  position: relative; z-index: 1;
}
.auth-brand { text-align: center; margin-bottom: 28px; }
.auth-mark {
  width: 64px; height: 64px; border-radius: 18px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  display: inline-flex; align-items: center; justify-content: center;
  color: white; box-shadow: 0 12px 24px rgba(59,130,246,0.3);
  margin-bottom: 16px;
}
.auth-brand h1 {
  font-size: 28px; font-weight: 800; margin: 0;
  letter-spacing: -0.025em; color: #0f172a;
}
.auth-brand p {
  font-size: 13px; color: #64748b;
  margin: 4px 0 0; font-weight: 500;
}
.auth-tabs {
  display: flex; gap: 4px; padding: 4px;
  background: #f1f5f9; border-radius: 12px; margin-bottom: 24px;
}
.auth-tabs button {
  flex: 1; padding: 9px; border: none; background: transparent;
  color: #64748b; font-size: 13px; font-weight: 600;
  border-radius: 8px; cursor: pointer; transition: all .15s;
  font-family: inherit;
}
.auth-tabs button.active {
  background: white; color: #3b82f6;
  box-shadow: 0 1px 2px rgba(0,0,0,0.05);
}
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-field span {
  font-size: 12px; font-weight: 600; color: #475569;
  display: inline-flex; align-items: center; gap: 5px;
}
.auth-field input {
  padding: 11px 14px; border: 1px solid #e2e8f0;
  border-radius: 10px; font-size: 14px; color: #0f172a;
  font-family: inherit; transition: all .15s; background: white;
}
.auth-field input:focus {
  outline: none; border-color: #3b82f6;
  box-shadow: 0 0 0 3px rgba(59,130,246,0.1);
}
.password-input { position: relative; }
.password-input input { padding-right: 44px; width: 100%; }
.pwd-toggle {
  position: absolute; right: 12px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; padding: 4px;
  color: #94a3b8; display: flex;
}
.pwd-toggle:hover { color: #0f172a; }
.auth-error {
  display: flex; align-items: center; gap: 8px;
  padding: 10px 12px; background: #fee2e2; color: #991b1b;
  border-radius: 8px; font-size: 13px; font-weight: 500;
}
.auth-submit {
  margin-top: 8px; padding: 13px;
  background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
  color: white; border: none; border-radius: 12px;
  font-size: 14px; font-weight: 700; cursor: pointer;
  transition: all .15s; font-family: inherit;
  box-shadow: 0 4px 12px rgba(59,130,246,0.3);
}
.auth-submit:hover:not(:disabled) {
  transform: translateY(-1px);
  box-shadow: 0 8px 20px rgba(59,130,246,0.4);
}
.auth-submit:disabled { opacity: 0.6; cursor: not-allowed; }
.auth-footer {
  text-align: center; margin-top: 20px;
  font-size: 13px; color: #64748b;
}
.auth-footer a {
  color: #3b82f6; font-weight: 600; cursor: pointer;
}
.auth-footer a:hover { text-decoration: underline; }
.auth-features {
  margin-top: 20px; padding-top: 20px;
  border-top: 1px solid #f1f5f9;
  text-align: center;
}
.auth-feature {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 11px; color: #94a3b8; font-weight: 500;
}
`;
