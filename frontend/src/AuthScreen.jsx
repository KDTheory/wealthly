import React, { useEffect, useState } from 'react';
import { Mail, Lock, User, Home, Eye, EyeOff, AlertCircle, Lock as LockIcon, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { auth, setToken } from './api.js';
import { enableDemoMode } from './demoData.js';

// On mount, capture any reset_token from the URL so we can land directly
// on the "set new password" screen and clean it out of the address bar.
function readResetTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('reset_token');
}

export default function AuthScreen({ onAuth, onTryDemo }) {
  const initialResetToken = readResetTokenFromUrl();
  const [mode, setMode] = useState(initialResetToken ? 'reset' : 'login'); // login | register | forgot | reset
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [householdName, setHouseholdName] = useState('');
  const [showPwd, setShowPwd] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [info, setInfo] = useState(null);
  const [resetToken] = useState(initialResetToken);

  // Once we've loaded with a reset token, scrub it from the URL so a refresh
  // (or the user pasting it elsewhere) doesn't keep a single-use token live.
  useEffect(() => {
    if (initialResetToken) {
      const url = new URL(window.location.href);
      url.searchParams.delete('reset_token');
      window.history.replaceState({}, '', url.toString());
    }
  }, [initialResetToken]);

  const switchMode = (next) => {
    setMode(next);
    setError(null);
    setInfo(null);
    setPassword('');
    setConfirmPassword('');
  };

  const submit = async (e) => {
    e.preventDefault();
    setError(null);
    setInfo(null);
    setLoading(true);
    try {
      if (mode === 'login') {
        const result = await auth.login(email, password);
        setToken(result.access_token);
        onAuth();
      } else if (mode === 'register') {
        const result = await auth.register(email, password, fullName, householdName || 'Mon foyer');
        setToken(result.access_token);
        onAuth();
      } else if (mode === 'forgot') {
        await auth.forgotPassword(email);
        setInfo("Si cet email existe, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte (et vos spams).");
      } else if (mode === 'reset') {
        if (password.length < 8) throw new Error("Le mot de passe doit faire au moins 8 caractères.");
        if (password !== confirmPassword) throw new Error("Les deux mots de passe ne correspondent pas.");
        const result = await auth.resetPassword(resetToken, password);
        setToken(result.access_token);
        onAuth();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-bg" aria-hidden="true" />
      <div className="auth-grid" aria-hidden="true" />

      <div className="auth-shell">
        {/* Brand column */}
        <aside className="auth-brand-col">
          <div className="auth-brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width="28" height="28">
              <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
              <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
            </svg>
          </div>
          <div className="auth-wordmark">Wealthly</div>
          <div className="auth-tagline">Gestion de patrimoine privée</div>

          <div className="auth-pitch">
            Suivez. Comprenez. Décidez. La vue consolidée de votre patrimoine familial — comptes, placements, immobilier, dettes — souveraine et chiffrée.
          </div>

          <div className="auth-bullets">
            <div className="auth-bullet"><span className="auth-bullet-dot"/>Auto-hébergé. Vos données ne sortent pas de chez vous.</div>
            <div className="auth-bullet"><span className="auth-bullet-dot"/>Catégorisation par IA, optionnelle, avec votre clé.</div>
            <div className="auth-bullet"><span className="auth-bullet-dot"/>Multi-membres. Une vue par foyer, une par personne.</div>
          </div>
        </aside>

        {/* Form column */}
        <main className="auth-form-col">
          <div className="auth-form-card">
            {(mode === 'login' || mode === 'register') ? (
              <div className="auth-tabs">
                <button
                  className={mode === 'login' ? 'active' : ''}
                  onClick={() => switchMode('login')}
                  type="button"
                >Connexion</button>
                <button
                  className={mode === 'register' ? 'active' : ''}
                  onClick={() => switchMode('register')}
                  type="button"
                >Créer un compte</button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => switchMode('login')}
                className="auth-back-link"
              >
                <ArrowLeft size={13} /> Retour à la connexion
              </button>
            )}

            <h2 className="auth-title">
              {mode === 'login' && 'Accéder à votre espace'}
              {mode === 'register' && 'Créer votre espace'}
              {mode === 'forgot' && 'Mot de passe oublié'}
              {mode === 'reset' && 'Nouveau mot de passe'}
            </h2>
            <p className="auth-subtitle">
              {mode === 'login' && 'Identifiants confidentiels.'}
              {mode === 'register' && 'Vos données restent chez vous.'}
              {mode === 'forgot' && 'Renseignez votre email — vous recevrez un lien pour choisir un nouveau mot de passe.'}
              {mode === 'reset' && 'Choisissez votre nouveau mot de passe.'}
            </p>

            <form onSubmit={submit} className="auth-form">
              {mode === 'register' && (
                <>
                  <label className="auth-field">
                    <span><User size={13} /> Votre prénom</span>
                    <input
                      type="text"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Antoine"
                      required
                      autoFocus
                    />
                  </label>
                  <label className="auth-field">
                    <span><Home size={13} /> Nom du foyer <em>(optionnel)</em></span>
                    <input
                      type="text"
                      value={householdName}
                      onChange={(e) => setHouseholdName(e.target.value)}
                      placeholder="Famille Dupont"
                    />
                  </label>
                </>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
                <label className="auth-field">
                  <span><Mail size={13} /> Email</span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="vous@exemple.fr"
                    required
                    autoFocus={mode === 'login' || mode === 'forgot'}
                  />
                </label>
              )}

              {(mode === 'login' || mode === 'register' || mode === 'reset') && (
                <label className="auth-field">
                  <span><Lock size={13} /> {mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}</span>
                  <div className="password-input">
                    <input
                      type={showPwd ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={mode === 'login' ? '••••••••' : 'Au moins 8 caractères'}
                      minLength={mode === 'login' ? undefined : 8}
                      required
                      autoFocus={mode === 'reset'}
                    />
                    <button
                      type="button"
                      className="pwd-toggle"
                      onClick={() => setShowPwd(!showPwd)}
                      aria-label="Afficher / masquer le mot de passe"
                    >
                      {showPwd ? <EyeOff size={15} /> : <Eye size={15} />}
                    </button>
                  </div>
                </label>
              )}

              {mode === 'reset' && (
                <label className="auth-field">
                  <span><Lock size={13} /> Confirmer le mot de passe</span>
                  <input
                    type={showPwd ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Retapez le même mot de passe"
                    minLength={8}
                    required
                  />
                </label>
              )}

              {error && (
                <div className="auth-error">
                  <AlertCircle size={14} /> {error}
                </div>
              )}
              {info && (
                <div className="auth-info">
                  <Check size={14} /> {info}
                </div>
              )}

              <button type="submit" className="auth-submit" disabled={loading}>
                {loading
                  ? <span className="auth-loading">Patientez<span className="dots"/></span>
                  : mode === 'login'
                  ? 'Se connecter'
                  : mode === 'register'
                  ? 'Créer mon compte'
                  : mode === 'forgot'
                  ? 'Envoyer le lien'
                  : 'Définir le mot de passe'}
              </button>
            </form>

            <div className="auth-footer">
              {mode === 'login' && (
                <>
                  <a onClick={() => switchMode('forgot')} className="auth-forgot-link">Mot de passe oublié ?</a>
                  <span style={{ display: 'block', marginTop: 8 }}>
                    Pas encore de compte ? <a onClick={() => switchMode('register')}>Créer un compte</a>
                  </span>
                </>
              )}
              {mode === 'register' && (
                <span>Déjà inscrit ? <a onClick={() => switchMode('login')}>Se connecter</a></span>
              )}
              {mode === 'forgot' && (
                <span>Vous vous souvenez ? <a onClick={() => switchMode('login')}>Se connecter</a></span>
              )}
            </div>

            {(mode === 'login' || mode === 'register') && onTryDemo && (
              <button
                type="button"
                onClick={() => { enableDemoMode(); onTryDemo(); }}
                className="auth-demo-button"
              >
                <Sparkles size={14} /> Voir avec un jeu de démo
              </button>
            )}

            <div className="auth-meta">
              <LockIcon size={11} /> Connexion chiffrée · session JWT
            </div>
          </div>
        </main>
      </div>

      <style>{authStyles}</style>
    </div>
  );
}

const authStyles = `
.auth-screen {
  min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  background: #0c0d10;
  color: #ebe8e3;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  position: relative; overflow: hidden;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em;
  padding: 32px 24px;
}

/* Subtle radial glow + grid texture, very low contrast */
.auth-bg {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 60% 40% at 70% 20%, rgba(197, 165, 114, 0.08), transparent 70%),
    radial-gradient(ellipse 60% 40% at 20% 90%, rgba(197, 165, 114, 0.04), transparent 60%);
}
.auth-grid {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.012) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.012) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 80% 60% at 50% 50%, black 30%, transparent 80%);
}

.auth-shell {
  position: relative; z-index: 1;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 64px;
  width: 100%;
  max-width: 1040px;
  align-items: center;
}

/* Brand column */
.auth-brand-col {
  display: flex; flex-direction: column; gap: 16px;
  padding: 24px 0;
}
.auth-brand-mark {
  width: 48px; height: 48px;
  border-radius: 6px;
  background: rgba(197, 165, 114, 0.1);
  border: 1px solid rgba(197, 165, 114, 0.32);
  color: #c5a572;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 4px;
}
.auth-wordmark {
  font-size: 44px; font-weight: 500; letter-spacing: -0.04em;
  color: #ebe8e3;
  line-height: 1;
}
.auth-tagline {
  font-size: 10px; font-weight: 500;
  text-transform: uppercase; letter-spacing: 0.22em;
  color: #c5a572;
}
.auth-pitch {
  font-size: 16px; line-height: 1.6;
  color: #b5b2ab;
  max-width: 400px;
  margin-top: 28px;
  letter-spacing: -0.01em;
}
.auth-bullets {
  display: flex; flex-direction: column; gap: 10px;
  margin-top: 20px;
}
.auth-bullet {
  display: flex; align-items: center; gap: 10px;
  font-size: 13px; color: #8c8a85;
}
.auth-bullet-dot {
  width: 4px; height: 4px; border-radius: 50%;
  background: #c5a572;
  flex-shrink: 0;
}

/* Form column */
.auth-form-col {
  display: flex; justify-content: center;
}
.auth-form-card {
  background: #15171c;
  border: 1px solid #232730;
  border-radius: 12px;
  padding: 32px;
  width: 100%; max-width: 420px;
  box-shadow: 0 24px 60px -20px rgba(0,0,0,0.5);
}

.auth-tabs {
  display: flex; gap: 2px; padding: 3px;
  background: #11131a;
  border: 1px solid #232730;
  border-radius: 8px;
  margin-bottom: 24px;
}
.auth-tabs button {
  flex: 1; padding: 8px; border: none; background: transparent;
  color: #8c8a85; font-size: 12px; font-weight: 500;
  border-radius: 5px; cursor: pointer; transition: all .15s;
  font-family: inherit; letter-spacing: 0.01em;
}
.auth-tabs button:hover { color: #ebe8e3; }
.auth-tabs button.active {
  background: #1b1d24; color: #ebe8e3;
  border: 1px solid #2e333f;
  padding: 7px;
}

.auth-title {
  font-size: 18px; font-weight: 600; letter-spacing: -0.02em;
  color: #ebe8e3; margin: 0 0 4px;
}
.auth-subtitle {
  font-size: 13px; color: #8c8a85; margin: 0 0 20px;
}

.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-field span {
  font-size: 11px; font-weight: 500; color: #b5b2ab;
  display: inline-flex; align-items: center; gap: 6px;
  text-transform: uppercase; letter-spacing: 0.06em;
}
.auth-field span em {
  color: #7a7872; font-style: normal; font-weight: 400; text-transform: none; letter-spacing: 0;
}
.auth-field input {
  padding: 10px 12px;
  border: 1px solid #232730;
  border-radius: 6px;
  font-size: 14px;
  color: #ebe8e3;
  background: #11131a;
  font-family: inherit;
  transition: border-color .15s, background .15s, box-shadow .15s;
  letter-spacing: -0.01em;
}
.auth-field input::placeholder { color: #5a5a55; }
.auth-field input:focus {
  outline: none;
  border-color: #c5a572;
  background: #15171c;
  box-shadow: 0 0 0 3px rgba(197, 165, 114, 0.08);
}

.password-input { position: relative; }
.password-input input { padding-right: 40px; width: 100%; }
.pwd-toggle {
  position: absolute; right: 10px; top: 50%; transform: translateY(-50%);
  background: none; border: none; cursor: pointer; padding: 4px;
  color: #5a5a55; display: flex;
  transition: color .15s;
}
.pwd-toggle:hover { color: #ebe8e3; }

.auth-error {
  display: flex; align-items: center; gap: 8px;
  padding: 9px 11px;
  background: rgba(196, 113, 88, 0.08);
  color: #e0917a;
  border: 1px solid rgba(196, 113, 88, 0.25);
  border-radius: 6px;
  font-size: 12px; font-weight: 500;
}
.auth-info {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 9px 11px;
  background: rgba(136, 169, 120, 0.08);
  color: #a5c298;
  border: 1px solid rgba(136, 169, 120, 0.25);
  border-radius: 6px;
  font-size: 12px; font-weight: 500;
  line-height: 1.5;
}
.auth-info svg { flex-shrink: 0; margin-top: 2px; }
.auth-back-link {
  display: inline-flex; align-items: center; gap: 6px;
  background: none; border: none; padding: 0;
  margin-bottom: 18px;
  color: #8c8a85; font-size: 12px; font-weight: 500;
  cursor: pointer; font-family: inherit;
  transition: color .15s;
}
.auth-back-link:hover { color: #ebe8e3; }
.auth-forgot-link {
  display: inline-block;
  font-size: 12px;
  color: #8c8a85 !important;
}
.auth-forgot-link:hover { color: #c5a572 !important; }

.auth-submit {
  margin-top: 6px; padding: 11px;
  background: #c5a572;
  color: #0c0d10;
  border: none;
  border-radius: 6px;
  font-size: 13px; font-weight: 600;
  cursor: pointer;
  transition: background .15s, transform .05s;
  font-family: inherit;
  letter-spacing: 0.01em;
}
.auth-submit:hover:not(:disabled) { background: #d4b687; }
.auth-submit:active:not(:disabled) { transform: translateY(1px); }
.auth-submit:disabled {
  background: #232730; color: #7a7872; cursor: not-allowed;
}
.auth-loading .dots::after {
  content: '...'; animation: authDots 1.2s infinite;
  display: inline-block; width: 1em; text-align: left;
}
@keyframes authDots {
  0%, 20% { content: '.'; }
  40% { content: '..'; }
  60%, 100% { content: '...'; }
}

.auth-footer {
  text-align: center; margin-top: 18px;
  font-size: 12px; color: #8c8a85;
}
.auth-footer a {
  color: #c5a572; font-weight: 500; cursor: pointer;
  border-bottom: 1px solid transparent;
  transition: border-color .15s;
}
.auth-footer a:hover { border-color: #c5a572; }

.auth-demo-button {
  display: flex; align-items: center; justify-content: center; gap: 7px;
  width: 100%;
  margin-top: 14px; padding: 10px;
  background: transparent;
  border: 1px dashed #2e333f;
  border-radius: 6px;
  color: #c5a572;
  font-family: inherit; font-size: 12px; font-weight: 500;
  cursor: pointer;
  transition: background .15s, border-color .15s;
  letter-spacing: 0.01em;
}
.auth-demo-button:hover {
  background: rgba(197, 165, 114, 0.06);
  border-color: rgba(197, 165, 114, 0.5);
  border-style: solid;
}

.auth-meta {
  display: flex; align-items: center; justify-content: center; gap: 5px;
  margin-top: 18px; padding-top: 18px;
  border-top: 1px solid #232730;
  font-size: 10px; color: #5a5a55;
  font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em;
}

/* Responsive — stack on narrow screens */
@media (max-width: 860px) {
  .auth-shell {
    grid-template-columns: 1fr;
    gap: 32px;
    max-width: 460px;
  }
  .auth-brand-col {
    text-align: center; align-items: center;
    padding: 0;
  }
  .auth-pitch { display: none; }
  .auth-bullets { display: none; }
  .auth-wordmark { font-size: 36px; }
}
`;
