import React, { useEffect, useState } from 'react';
import { Mail, Lock, User, Home, Eye, EyeOff, AlertCircle, Lock as LockIcon, ArrowLeft, Check, Sparkles, ShieldCheck, MapPin, EyeOff as PrivacyIcon } from 'lucide-react';
import { auth, setToken } from './api.js';
import { enableDemoMode } from './demoData.js';
import { LegalModal } from './components/LegalModal.jsx';

// On mount, capture any reset_token from the URL so we can land directly
// on the "set new password" screen and clean it out of the address bar.
function readResetTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('reset_token');
}

export default function AuthScreen({ onAuth, onTryDemo, onBackToLanding, initialMode = 'login' }) {
  const initialResetToken = readResetTokenFromUrl();
  const [mode, setMode] = useState(initialResetToken ? 'reset' : initialMode); // login | register | forgot | reset
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
  const [legal, setLegal] = useState(null);

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
        {/* Back to landing — only shown when we have a callback (i.e. came from Landing, not from a reset_token deep link) */}
        {onBackToLanding && (
          <button type="button" onClick={onBackToLanding} className="auth-back-landing">
            <ArrowLeft size={14}/> Retour à l'accueil
          </button>
        )}

        {/* Tiny brand mark + wordmark, centered at the top */}
        <div className="auth-brand-row">
          <div className="auth-brand-mark">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width="22" height="22">
              <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
              <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
            </svg>
          </div>
          <div className="auth-wordmark">Wealthly</div>
        </div>

        {/* Hero — slim version (full marketing is on Landing now) */}
        <div className="auth-hero">
          <div className="auth-eyebrow">ESPACE PERSONNEL</div>
          <h1 className="auth-headline">
            {mode === 'register' && <>Créer <em>votre compte.</em></>}
            {mode === 'login' && <>Bon <em>retour.</em></>}
            {mode === 'forgot' && <>Récupérer <em>votre accès.</em></>}
            {mode === 'reset' && <>Choisir <em>un nouveau mot de passe.</em></>}
          </h1>
          <p className="auth-subhead">
            {mode === 'register'
              ? 'Email + mot de passe. Pas de carte bleue, pas d\'engagement.'
              : 'Identifiez-vous pour accéder à votre tableau de bord patrimonial.'}
          </p>

          {/* Trust pills row */}
          <div className="auth-pills">
            <span className="auth-pill"><ShieldCheck size={12}/> Synchro DSP2 agréée</span>
            <span className="auth-pill"><MapPin size={12}/> Hébergé en UE</span>
            <span className="auth-pill"><PrivacyIcon size={12}/> Aucune revente de données</span>
          </div>
        </div>

        {/* Form column — single centered card under the hero */}
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
              {mode === 'login' && <>Accéder à <em>votre espace</em></>}
              {mode === 'register' && <>Créer <em>votre espace</em></>}
              {mode === 'forgot' && <>Mot de passe <em>oublié</em></>}
              {mode === 'reset' && <>Nouveau <em>mot de passe</em></>}
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
              <span className="auth-meta-sep">·</span>
              <button className="auth-legal-link" onClick={() => setLegal('cgu')}>CGU</button>
              <button className="auth-legal-link" onClick={() => setLegal('privacy')}>Confidentialité</button>
            </div>
          </div>
        </main>
      </div>

      {legal && <LegalModal section={legal} onClose={() => setLegal(null)} />}

      <style>{authStyles}</style>
    </div>
  );
}

const authStyles = `
.auth-screen {
  min-height: 100vh;
  display: flex; align-items: flex-start; justify-content: center;
  /* Two-layer base: subtle vignette around an off-black canvas, so the page
     reads warmer and less flat than a single solid colour. */
  background:
    radial-gradient(ellipse 90% 70% at 50% 30%, #14161c 0%, #0d0f13 55%, #0a0b0e 100%);
  color: #ebe8e3;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  position: relative; overflow-x: hidden;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em;
  padding: 56px 24px 72px;
}

/* Ambient gold glows — one large behind the form card, one small lifting the
   brand column. Stronger than before so the page no longer feels flat. */
.auth-bg {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background:
    radial-gradient(ellipse 50% 55% at 78% 50%, rgba(197, 165, 114, 0.16), transparent 70%),
    radial-gradient(ellipse 45% 35% at 18% 30%, rgba(197, 165, 114, 0.07), transparent 65%),
    radial-gradient(ellipse 60% 30% at 50% 100%, rgba(197, 165, 114, 0.04), transparent 70%);
}
.auth-grid {
  position: absolute; inset: 0; pointer-events: none; z-index: 0;
  background-image:
    linear-gradient(rgba(255,255,255,0.018) 1px, transparent 1px),
    linear-gradient(90deg, rgba(255,255,255,0.018) 1px, transparent 1px);
  background-size: 64px 64px;
  mask-image: radial-gradient(ellipse 75% 60% at 50% 50%, black 30%, transparent 80%);
}

.auth-shell {
  position: relative; z-index: 1;
  display: flex; flex-direction: column; align-items: center;
  gap: 28px;
  width: 100%;
  max-width: 920px;
  text-align: center;
  padding: 0;
}
/* The hero + form stay narrower than the marketing sections below. */
.auth-shell > .auth-brand-row,
.auth-shell > .auth-hero,
.auth-shell > .auth-form-col {
  max-width: 560px;
}

/* Brand row — small monogram + wordmark, sits just above the hero */
.auth-brand-row {
  display: inline-flex; align-items: center; gap: 12px;
}
.auth-brand-mark {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: rgba(197, 165, 114, 0.08);
  border: 1px solid rgba(197, 165, 114, 0.32);
  color: #c5a572;
  display: inline-flex; align-items: center; justify-content: center;
}
.auth-wordmark {
  font-size: 19px; font-weight: 600; letter-spacing: -0.02em;
  color: #ebe8e3;
  line-height: 1;
}

/* Hero — heyfinly homepage hero layout, centered */
.auth-hero {
  display: flex; flex-direction: column; align-items: center; gap: 18px;
  margin-top: 4px;
}
.auth-eyebrow {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.24em;
  color: #c5a572;
  padding: 6px 14px;
  border: 1px solid rgba(197, 165, 114, 0.28);
  border-radius: 999px;
  background: rgba(197, 165, 114, 0.05);
}
.auth-headline {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: clamp(38px, 6.4vw, 60px);
  font-weight: 400;
  letter-spacing: -0.02em;
  line-height: 1.04;
  color: #ebe8e3;
  margin: 4px 0 0;
}
.auth-headline em { font-style: italic; color: #c5a572; font-weight: 400; }
.auth-subhead {
  font-size: 15px; line-height: 1.6;
  color: #b5b2ab;
  max-width: 460px;
  margin: 0;
  letter-spacing: -0.005em;
}

/* Trust pills row — social proof equivalent */
.auth-pills {
  display: flex; flex-wrap: wrap; justify-content: center;
  gap: 8px;
  margin-top: 10px;
}
.auth-pill {
  display: inline-flex; align-items: center; gap: 7px;
  padding: 7px 13px;
  background: rgba(255, 255, 255, 0.025);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 999px;
  font-size: 11.5px; font-weight: 500;
  color: #c8c5be;
  letter-spacing: 0.005em;
}
.auth-pill svg { color: #c5a572; }

/* Form column — sits centered under the hero */
.auth-form-col {
  display: flex; justify-content: center;
  width: 100%;
  margin-top: 8px;
}
.auth-form-card {
  background: #181a20;                                    /* slightly lighter than the page so the card lifts */
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-top: 2px solid rgba(197, 165, 114, 0.85);        /* gold signature line, same language as the Dashboard hero */
  border-radius: 14px;
  padding: 32px;
  width: 100%; max-width: 420px;
  box-shadow:
    0 24px 60px -20px rgba(0, 0, 0, 0.6),
    0 0 0 1px rgba(197, 165, 114, 0.04) inset;
  position: relative;
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
  font-family: 'Source Serif 4', 'Source Serif Pro', Georgia, serif;
  font-size: 22px; font-weight: 400; letter-spacing: -0.018em;
  color: #ebe8e3; margin: 0 0 4px;
}
.auth-title em { font-style: italic; color: #c5a572; font-weight: 400; }
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
.auth-back-landing {
  display: inline-flex; align-items: center; gap: 6px;
  background: transparent; border: 1px solid rgba(255,255,255,0.08);
  padding: 7px 12px; border-radius: 999px;
  color: #a8a59f; font-size: 12px; font-weight: 500; font-family: inherit;
  cursor: pointer; align-self: flex-start;
  margin-bottom: 8px;
  transition: color .15s, border-color .15s, background .15s;
}
.auth-back-landing:hover { color: #c5a572; border-color: rgba(197,165,114,0.35); background: rgba(197,165,114,0.05); }
.auth-forgot-link {
  display: inline-block;
  font-size: 12px;
  color: #8c8a85 !important;
}
.auth-forgot-link:hover { color: #c5a572 !important; }

.auth-submit {
  margin-top: 6px; padding: 11px;
  background: #c5a572;
  color: #0a0b0e;
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
  flex-wrap: wrap;
  margin-top: 18px; padding-top: 18px;
  border-top: 1px solid #232730;
  font-size: 10px; color: #5a5a55;
  font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em;
}
.auth-meta-sep { opacity: 0.4; }
.auth-legal-link {
  background: none; border: none; padding: 0; cursor: pointer;
  font-size: 10px; color: #5a5a55; font-family: inherit;
  font-weight: 500; text-transform: uppercase; letter-spacing: 0.12em;
  transition: color .15s;
}
.auth-legal-link:hover { color: #c5a572; }

/* === Section eyebrows + titles, shared across the marketing blocks === */
.auth-section-eyebrow {
  font-size: 10.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.24em;
  color: #c5a572;
  margin-bottom: 12px;
}
.auth-section-title {
  font-size: clamp(22px, 3.2vw, 30px);
  font-weight: 600; letter-spacing: -0.025em; line-height: 1.15;
  color: #ebe8e3;
  margin: 0 0 28px;
  max-width: 620px;
  margin-left: auto; margin-right: auto;
}

/* === Bloc 1 — Aperçu produit (faux dashboard mockup) === */
.auth-preview {
  width: 100%;
  margin-top: 32px;
  padding-top: 48px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.auth-mockup {
  background: #11131a;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 30px 80px -30px rgba(0,0,0,0.7),
    0 0 0 1px rgba(197, 165, 114, 0.06) inset;
  text-align: left;
}
.mockup-chrome {
  display: flex; align-items: center; gap: 6px;
  padding: 10px 14px;
  background: #0d0f14;
  border-bottom: 1px solid rgba(255,255,255,0.06);
}
.mockup-dot {
  width: 9px; height: 9px; border-radius: 50%;
  background: #2a2d36;
}
.mockup-dot.d1 { background: #c47158; }
.mockup-dot.d2 { background: #d4a554; }
.mockup-dot.d3 { background: #88a978; }
.mockup-url {
  margin-left: 14px;
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 10.5px; color: #6e6a64;
  letter-spacing: 0.02em;
}
.mockup-body {
  display: grid; grid-template-columns: 140px 1fr;
  min-height: 260px;
}
.mockup-sidebar {
  background: #0d0f14;
  border-right: 1px solid rgba(255,255,255,0.04);
  padding: 16px 12px;
  display: flex; flex-direction: column; gap: 4px;
}
.mockup-sb-brand {
  width: 26px; height: 26px;
  border-radius: 6px;
  background: rgba(197, 165, 114, 0.12);
  border: 1px solid rgba(197, 165, 114, 0.32);
  color: #c5a572;
  display: flex; align-items: center; justify-content: center;
  font-weight: 700; font-size: 12px;
  margin-bottom: 14px;
}
.mockup-sb-item {
  font-size: 11.5px; color: #6e6a64;
  padding: 6px 8px; border-radius: 5px;
}
.mockup-sb-item.active {
  background: rgba(197, 165, 114, 0.08);
  color: #ebe8e3;
}
.mockup-content {
  padding: 22px 24px 18px;
  background: #0a0b0e;
}
.mockup-eyebrow {
  font-size: 9px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.22em;
  color: #c5a572;
}
.mockup-hero {
  font-size: 38px; font-weight: 700; letter-spacing: -0.03em;
  color: #ebe8e3; line-height: 1.1; margin-top: 6px;
  font-variant-numeric: tabular-nums;
}
.mockup-perf {
  font-size: 11px; font-weight: 600;
  color: #88a978;
  margin-top: 4px;
}
.mockup-chart {
  width: 100%; height: 70px; margin-top: 16px; display: block;
}
.mockup-kpis {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 10px; margin-top: 10px;
}
.mockup-kpi {
  background: #13151a;
  border: 1px solid rgba(255,255,255,0.05);
  border-left: 2px solid #c5a572;
  border-radius: 5px;
  padding: 8px 10px;
}
.mk-l { font-size: 8.5px; font-weight: 700; color: #6e6a64; letter-spacing: 0.16em; }
.mk-v { font-size: 13px; font-weight: 600; color: #ebe8e3; margin-top: 2px; font-variant-numeric: tabular-nums; }
.mk-v.neg { color: #c47158; }

/* === Bloc 2 — Features grid === */
.auth-features {
  width: 100%;
  margin-top: 56px;
  padding-top: 48px;
  border-top: 1px solid rgba(255,255,255,0.06);
}
.auth-feat-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  text-align: left;
}
.auth-feat-card {
  background: #13151a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 22px 20px;
  transition: border-color .15s, background .15s;
}
.auth-feat-card:hover {
  border-color: rgba(197, 165, 114, 0.3);
  background: #161820;
}
.feat-icon {
  width: 36px; height: 36px;
  border-radius: 8px;
  background: rgba(197, 165, 114, 0.1);
  color: #c5a572;
  display: inline-flex; align-items: center; justify-content: center;
  margin-bottom: 14px;
}
.feat-title {
  font-size: 14px; font-weight: 600; color: #ebe8e3;
  letter-spacing: -0.01em; margin-bottom: 6px;
}
.feat-desc {
  font-size: 12.5px; color: #a8a59f; line-height: 1.55;
}

/* === Bloc 3 — Numbers strip === */
.auth-numbers {
  width: 100%;
  margin-top: 56px;
  padding: 32px 24px;
  background: linear-gradient(180deg, rgba(197, 165, 114, 0.04), rgba(197, 165, 114, 0.01));
  border: 1px solid rgba(197, 165, 114, 0.14);
  border-radius: 12px;
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 12px;
}
.auth-num { text-align: center; }
.num-v {
  font-size: 28px; font-weight: 700; color: #c5a572;
  letter-spacing: -0.03em; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.num-suf { font-size: 18px; opacity: 0.7; }
.num-l {
  font-size: 11px; color: #8c8a85; line-height: 1.35;
  margin-top: 8px;
  letter-spacing: 0.02em;
}

/* === Bloc 4 — Footer === */
.auth-foot {
  width: 100%;
  margin-top: 48px;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; align-items: center;
  flex-wrap: wrap; gap: 14px;
  font-size: 12px; color: #6e6a64;
}
.foot-left {
  display: inline-flex; align-items: center; gap: 10px;
}
.foot-brand {
  display: inline-flex; align-items: center; gap: 7px;
  color: #c5a572; font-weight: 600;
}
.foot-sep { color: #2a2d36; }
.foot-tag { color: #8c8a85; }
.foot-right {
  display: inline-flex; gap: 18px;
}
.foot-right a {
  display: inline-flex; align-items: center; gap: 5px;
  color: #8c8a85; text-decoration: none;
  transition: color .15s;
}
.foot-right a:hover { color: #c5a572; }

/* Responsive — already centered, just tighten the hero on narrow screens */
@media (max-width: 720px) {
  .auth-shell { gap: 22px; }
  .auth-hero { gap: 14px; }
  .auth-subhead { font-size: 14px; }
  .auth-pills { gap: 6px; }
  .auth-pill { padding: 6px 11px; font-size: 11px; }
  .auth-form-card { padding: 24px; }
  .auth-feat-grid { grid-template-columns: 1fr; }
  .auth-numbers { grid-template-columns: repeat(2, 1fr); gap: 22px; padding: 24px 20px; }
  .mockup-body { grid-template-columns: 60px 1fr; }
  .mockup-sb-item { font-size: 0; padding: 6px; }
  .mockup-sb-item.active::after { content: '·'; font-size: 14px; color: #c5a572; }
  .mockup-hero { font-size: 28px; }
  .mockup-kpis { grid-template-columns: 1fr; }
  .auth-foot { flex-direction: column; text-align: center; }
}
`;
