// ============================================================================
// AuthScreen — Wealthly v3 (Claude Design)
//
// Même vocabulaire que la Landing magazine : top strip + masthead serif
// + carte formulaire sobre. Papier chaud, cobalt rare, Newsreader pour
// les titres, Geist pour l'UI.
//
// Modes: login | register | forgot | reset.
// Auth = cookie-based (set-cookie au login/register/reset), pas de
// localStorage côté token de session.
// ============================================================================
import { useEffect, useState } from 'react';
import { Mail, Lock, User, Home, Eye, EyeOff, AlertCircle, ArrowLeft, Check, Sparkles } from 'lucide-react';
import { auth } from './api.js';
import { enableDemoMode } from './demoData.js';
import { LegalModal } from './components/LegalModal.jsx';

function readResetTokenFromUrl() {
  const params = new URLSearchParams(window.location.search);
  return params.get('reset_token');
}

export default function AuthScreen({ onAuth, onTryDemo, onBackToLanding, initialMode = 'login' }) {
  const initialResetToken = readResetTokenFromUrl();
  const [mode, setMode] = useState(initialResetToken ? 'reset' : initialMode);
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

  // Force dark — cohérent avec la Landing magazine en encre profonde.
  useEffect(() => {
    const prev = document.documentElement.getAttribute('data-theme');
    document.documentElement.setAttribute('data-theme', 'dark');
    return () => { if (prev) document.documentElement.setAttribute('data-theme', prev); };
  }, []);

  // Scrub reset_token de l'URL après lecture.
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
        await auth.login(email, password);
        onAuth();
      } else if (mode === 'register') {
        await auth.register(email, password, fullName, householdName || 'Mon foyer');
        onAuth();
      } else if (mode === 'forgot') {
        await auth.forgotPassword(email);
        setInfo("Si cet email existe, un lien de réinitialisation vient d'être envoyé. Vérifiez votre boîte (et vos spams).");
      } else if (mode === 'reset') {
        if (password.length < 10) throw new Error("Le mot de passe doit faire au moins 10 caractères.");
        if (password !== confirmPassword) throw new Error("Les deux mots de passe ne correspondent pas.");
        await auth.resetPassword(resetToken, password);
        onAuth();
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Styles/>
      <div className="auth-page">
        {/* TOP STRIP — identique à la Landing */}
        <div className="auth-strip">
          <div className="auth-mark">
            <span className="auth-logo">W</span>
            <span>Wealthly Studio</span>
          </div>
          <div className="auth-strip-actions">
            {onBackToLanding && (
              <button type="button" onClick={onBackToLanding} className="auth-strip-link">
                <ArrowLeft size={12}/> Retour
              </button>
            )}
          </div>
        </div>

        {/* MASTHEAD compact — eyebrow + titre serif + deck */}
        <div className="auth-masthead">
          <div className="auth-num-issue">
            {mode === 'login'    && '01 — Espace personnel'}
            {mode === 'register' && '02 — Création de compte'}
            {mode === 'forgot'   && '03 — Mot de passe oublié'}
            {mode === 'reset'    && '04 — Nouveau mot de passe'}
          </div>
          <h1 className="auth-title">
            {mode === 'login'    && <>Bon <em>retour.</em></>}
            {mode === 'register' && <>Créer <em>votre compte.</em></>}
            {mode === 'forgot'   && <>Récupérer <em>votre accès.</em></>}
            {mode === 'reset'    && <>Choisir <em>un nouveau mot de passe.</em></>}
          </h1>
          <p className="auth-deck">
            {mode === 'login'    && 'Identifiez-vous pour accéder à votre tableau de bord.'}
            {mode === 'register' && <>Email et mot de passe. <strong>Pas de carte bleue, pas d'engagement.</strong></>}
            {mode === 'forgot'   && 'Renseignez votre email — vous recevrez un lien pour choisir un nouveau mot de passe.'}
            {mode === 'reset'    && 'Choisissez un mot de passe que vous saurez retenir.'}
          </p>
        </div>

        {/* CARTE FORMULAIRE */}
        <div className="auth-card">
          {(mode === 'login' || mode === 'register') && (
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === 'login' ? 'on' : ''}
                onClick={() => switchMode('login')}
              >Connexion</button>
              <button
                type="button"
                className={mode === 'register' ? 'on' : ''}
                onClick={() => switchMode('register')}
              >Créer un compte</button>
            </div>
          )}

          {(mode === 'forgot' || mode === 'reset') && mode !== 'reset' && (
            <button type="button" onClick={() => switchMode('login')} className="auth-back-link">
              <ArrowLeft size={12}/> Retour à la connexion
            </button>
          )}

          <form onSubmit={submit} className="auth-form">
            {mode === 'register' && (
              <>
                <Field
                  label="Votre prénom"
                  icon={<User size={13}/>}
                  type="text"
                  value={fullName}
                  onChange={setFullName}
                  placeholder="Antoine"
                  required autoFocus
                />
                <Field
                  label={<>Nom du foyer <em className="auth-optional">(optionnel)</em></>}
                  icon={<Home size={13}/>}
                  type="text"
                  value={householdName}
                  onChange={setHouseholdName}
                  placeholder="Famille Dupont"
                />
              </>
            )}

            {(mode === 'login' || mode === 'register' || mode === 'forgot') && (
              <Field
                label="Email"
                icon={<Mail size={13}/>}
                type="email"
                value={email}
                onChange={setEmail}
                placeholder="vous@exemple.fr"
                required
                autoFocus={mode === 'login' || mode === 'forgot'}
              />
            )}

            {(mode === 'login' || mode === 'register' || mode === 'reset') && (
              <Field
                label={mode === 'reset' ? 'Nouveau mot de passe' : 'Mot de passe'}
                icon={<Lock size={13}/>}
                type={showPwd ? 'text' : 'password'}
                value={password}
                onChange={setPassword}
                placeholder={mode === 'login' ? '••••••••' : 'Au moins 10 caractères'}
                minLength={mode === 'login' ? undefined : 10}
                required
                autoFocus={mode === 'reset'}
                trailing={
                  <button
                    type="button"
                    className="auth-pwd-toggle"
                    onClick={() => setShowPwd(!showPwd)}
                    aria-label="Afficher / masquer le mot de passe"
                  >
                    {showPwd ? <EyeOff size={14}/> : <Eye size={14}/>}
                  </button>
                }
              />
            )}

            {mode === 'reset' && (
              <Field
                label="Confirmer le mot de passe"
                icon={<Lock size={13}/>}
                type={showPwd ? 'text' : 'password'}
                value={confirmPassword}
                onChange={setConfirmPassword}
                placeholder="Retapez le même mot de passe"
                minLength={10}
                required
              />
            )}

            {error && (
              <div className="auth-error" role="alert">
                <AlertCircle size={14}/> {error}
              </div>
            )}
            {info && (
              <div className="auth-info" role="status">
                <Check size={14}/> {info}
              </div>
            )}

            <button type="submit" className="auth-submit" disabled={loading}>
              {loading ? 'Patientez…' :
               mode === 'login'    ? 'Se connecter' :
               mode === 'register' ? 'Créer mon compte' :
               mode === 'forgot'   ? 'Envoyer le lien' :
                                     'Définir le mot de passe'}
            </button>
          </form>

          {/* Liens secondaires sous le formulaire */}
          <div className="auth-secondary">
            {mode === 'login' && (
              <>
                <button type="button" onClick={() => switchMode('forgot')} className="auth-link">
                  Mot de passe oublié ?
                </button>
              </>
            )}
            {mode === 'register' && (
              <span className="auth-secondary-note">
                Déjà inscrit ?{' '}
                <button type="button" onClick={() => switchMode('login')} className="auth-link">Se connecter</button>
              </span>
            )}
            {mode === 'forgot' && (
              <span className="auth-secondary-note">
                Vous vous souvenez ?{' '}
                <button type="button" onClick={() => switchMode('login')} className="auth-link">Se connecter</button>
              </span>
            )}
          </div>

          {(mode === 'login' || mode === 'register') && onTryDemo && (
            <button
              type="button"
              onClick={() => { enableDemoMode(); onTryDemo(); }}
              className="auth-demo"
            >
              <Sparkles size={13}/> Essayer avec un jeu de démo
            </button>
          )}
        </div>

        {/* COLOPHON */}
        <div className="auth-colophon">
          <span>WEALTHLY · v3 · {new Date().getFullYear()}</span>
          <span className="auth-star">✦</span>
          <span className="auth-legal">
            <button onClick={() => setLegal('cgu')}>CGU</button>
            <button onClick={() => setLegal('privacy')}>Confidentialité</button>
          </span>
        </div>
      </div>

      {legal && <LegalModal section={legal} onClose={() => setLegal(null)}/>}
    </>
  );
}

function Field({ label, icon, type, value, onChange, placeholder, required, autoFocus, minLength, trailing }) {
  return (
    <label className="auth-field">
      <span className="auth-field-label">{icon}{label}</span>
      <span className="auth-field-input">
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          required={required}
          autoFocus={autoFocus}
          minLength={minLength}
        />
        {trailing}
      </span>
    </label>
  );
}

function Styles() {
  return <style dangerouslySetInnerHTML={{ __html: css }}/>;
}

const css = `
.auth-page * { box-sizing: border-box; margin: 0; padding: 0; }
.auth-page {
  max-width: 640px;
  margin: 0 auto;
  padding: 56px 32px 56px;
  min-height: 100vh;
  display: flex; flex-direction: column;
  gap: 36px;
  background: #0F0E0C;
  color: #F1EEE4;
  font-family: 'Geist', system-ui, -apple-system, sans-serif;
  font-feature-settings: 'ss01', 'cv11';
  -webkit-font-smoothing: antialiased;
}
.auth-page button { font-family: inherit; cursor: pointer; }

/* TOP STRIP */
.auth-strip {
  display: flex; align-items: center; justify-content: space-between;
  padding-bottom: 16px;
  border-bottom: 1px solid #2A2823;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  color: #75716A; font-weight: 500;
}
.auth-mark { display: flex; align-items: center; gap: 10px; color: #F1EEE4; }
.auth-logo {
  width: 22px; height: 22px;
  background: #F1EEE4; border-radius: 5px;
  display: grid; place-items: center;
  color: #0F0E0C;
  font-weight: 700; font-size: 11px; letter-spacing: 0;
}
.auth-strip-actions { display: flex; gap: 12px; }
.auth-strip-link {
  background: transparent; border: none;
  font-size: 11px; text-transform: uppercase; letter-spacing: 0.14em;
  font-weight: 500; color: #A29E91;
  display: inline-flex; align-items: center; gap: 6px;
  transition: color 120ms;
}
.auth-strip-link:hover { color: #F1EEE4; }

/* MASTHEAD */
.auth-masthead { display: flex; flex-direction: column; gap: 14px; }
.auth-num-issue {
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic; font-size: 14px;
  color: #75716A; font-weight: 400; letter-spacing: -0.01em;
}
.auth-num-issue::before { content: '№ '; color: #4D4A45; }
.auth-title {
  font-family: 'Newsreader', Georgia, serif;
  font-weight: 400;
  font-size: clamp(40px, 6vw, 56px);
  line-height: 0.96;
  letter-spacing: -0.04em;
  color: #F1EEE4;
}
.auth-title em { font-style: italic; color: #A29E91; }
.auth-deck {
  font-size: 15px; line-height: 1.5;
  color: #A29E91; max-width: 48ch;
  letter-spacing: -0.005em;
}
.auth-deck strong { color: #F1EEE4; font-weight: 500; }

/* CARD */
.auth-card {
  background: #181714;
  border: 1px solid #2A2823;
  border-radius: 16px;
  padding: 28px 28px 24px;
  display: flex; flex-direction: column; gap: 20px;
}

/* Tabs */
.auth-tabs {
  display: flex;
  background: #0A0908;
  border-radius: 8px;
  padding: 3px;
  gap: 2px;
}
.auth-tabs button {
  flex: 1;
  height: 32px;
  background: transparent;
  border: none;
  border-radius: 6px;
  font-size: 13px; font-weight: 500; letter-spacing: -0.005em;
  color: #A29E91;
  transition: background 120ms, color 120ms;
}
.auth-tabs button:hover { color: #F1EEE4; }
.auth-tabs button.on {
  background: #181714;
  color: #F1EEE4;
  box-shadow: 0 1px 0 rgba(20,20,15,.04), 0 1px 2px rgba(20,20,15,.04);
}

.auth-back-link {
  background: transparent; border: none;
  font-size: 13px; color: #A29E91;
  display: inline-flex; align-items: center; gap: 6px;
  align-self: flex-start;
  letter-spacing: -0.005em;
  transition: color 120ms;
}
.auth-back-link:hover { color: #F1EEE4; }

/* Form */
.auth-form { display: flex; flex-direction: column; gap: 14px; }
.auth-field { display: flex; flex-direction: column; gap: 6px; }
.auth-field-label {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 12px; font-weight: 500; color: #A29E91;
  letter-spacing: -0.005em;
}
.auth-field-label svg { color: #75716A; }
.auth-optional {
  font-family: 'Newsreader', Georgia, serif;
  font-style: italic; font-weight: 400; color: #75716A;
}
.auth-field-input {
  position: relative;
  display: flex;
}
.auth-field-input input {
  flex: 1;
  height: 40px;
  padding: 0 14px;
  padding-right: 38px;
  border: 1px solid #2A2823;
  border-radius: 8px;
  background: #0F0E0C;
  color: #F1EEE4;
  font: 400 14px/1.4 'Geist', system-ui, sans-serif;
  letter-spacing: -0.005em;
  transition: border-color 120ms, box-shadow 120ms, background 120ms;
  width: 100%;
}
.auth-field-input input::placeholder { color: #4D4A45; }
.auth-field-input input:hover { border-color: #3A382F; }
.auth-field-input input:focus-visible {
  outline: none;
  background: #181714;
  border-color: #7E92FF;
  box-shadow: 0 0 0 3px #1B214A;
}
.auth-pwd-toggle {
  position: absolute; right: 10px; top: 50%;
  transform: translateY(-50%);
  background: transparent; border: none;
  color: #75716A;
  width: 24px; height: 24px;
  display: grid; place-items: center;
  border-radius: 4px;
  transition: color 120ms, background 120ms;
}
.auth-pwd-toggle:hover { color: #F1EEE4; background: #1F1D19; }

/* Submit */
.auth-submit {
  height: 44px;
  background: #F1EEE4;
  color: #0F0E0C;
  border: none;
  border-radius: 8px;
  font-size: 14px; font-weight: 500; letter-spacing: -0.005em;
  margin-top: 4px;
  transition: background 120ms;
}
.auth-submit:hover:not(:disabled) { background: #E5E2D8; }
.auth-submit:active:not(:disabled) { transform: translateY(1px); }
.auth-submit:disabled { opacity: 0.55; cursor: wait; }

/* Error / info banners */
.auth-error, .auth-info {
  display: flex; align-items: flex-start; gap: 8px;
  padding: 10px 12px;
  border-radius: 8px;
  font-size: 13px; line-height: 1.45;
}
.auth-error {
  background: #341B17; color: #E07A6E;
}
.auth-info {
  background: #15301F; color: #4FB57A;
}

/* Secondary links */
.auth-secondary {
  display: flex; justify-content: center; gap: 12px;
  font-size: 13px; color: #A29E91;
}
.auth-secondary-note { color: #A29E91; }
.auth-link {
  background: transparent; border: none; padding: 0;
  font-size: 13px;
  color: #7E92FF;
  text-decoration: underline; text-underline-offset: 3px;
  font-family: inherit;
  font-weight: 500;
  transition: color 120ms;
}
.auth-link:hover { color: #A6B4FF; }

/* Demo button */
.auth-demo {
  background: transparent;
  border: 1px dashed #3A382F;
  border-radius: 8px;
  padding: 12px;
  font-size: 13px;
  color: #A29E91;
  display: inline-flex; align-items: center; justify-content: center; gap: 8px;
  letter-spacing: -0.005em;
  transition: border-color 120ms, color 120ms, background 120ms;
}
.auth-demo:hover {
  border-color: #A29E91;
  color: #F1EEE4;
  background: #1F1D19;
}

/* Colophon */
.auth-colophon {
  margin-top: auto;
  padding-top: 18px;
  border-top: 1px solid #2A2823;
  display: flex; justify-content: space-between; align-items: center;
  font-size: 11px; letter-spacing: 0.06em; color: #75716A;
  text-transform: uppercase;
}
.auth-star { color: #4D4A45; font-size: 14px; letter-spacing: 0.4em; }
.auth-legal { display: flex; gap: 14px; }
.auth-legal button {
  background: transparent; border: none;
  font-size: 11px; letter-spacing: 0.06em; color: #75716A;
  text-transform: uppercase;
  font-family: inherit;
  text-decoration: underline; text-underline-offset: 3px;
  transition: color 120ms;
}
.auth-legal button:hover { color: #F1EEE4; }

/* Responsive */
@media (max-width: 520px) {
  .auth-page { padding: 32px 20px 32px; gap: 28px; }
  .auth-card { padding: 22px 18px 20px; }
  .auth-title { font-size: 36px; }
  .auth-colophon { flex-direction: column; gap: 8px; }
}
`;
