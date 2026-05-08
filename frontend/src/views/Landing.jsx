// ============================================================================
// Landing — public marketing page, Finary-style.
//
// Layout: sticky nav → hero with screenshot → "pilote auto" 2-col →
// bento 3-up features (each card has a real screenshot) → security badges →
// 3-step CTA → FAQ → footer.
//
// Inline CSS-in-JS for portability (matches AuthScreen.jsx pattern).
// All screenshots live in /public/landing/ — keep filenames in sync.
// ============================================================================
import React, { useState } from 'react';
import {
  ArrowRight, ShieldCheck, MapPin, EyeOff, Users, Building2, Calculator,
  Activity, Github, Mail, ChevronDown, Lock, Sparkles, BarChart3, Calendar,
} from 'lucide-react';
import { LegalModal } from '../components/LegalModal.jsx';

const Wmark = ({ size = 22 }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.4" strokeLinecap="square" strokeLinejoin="miter" width={size} height={size}>
    <rect x="3.5" y="3.5" width="17" height="17" rx="1.5"/>
    <path d="M7 9 L9.5 15.5 L12 10.5 L14.5 15.5 L17 9"/>
  </svg>
);

export default function Landing({ onSignIn, onSignUp, onTryDemo }) {
  const [legal, setLegal] = useState(null); // null | 'cgu' | 'privacy'
  return (
    <div className="lp">
      {/* === NAV === */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <span className="lp-brand-mark"><Wmark size={18}/></span>
            <span className="lp-brand-name">Wealthly</span>
          </div>
          <nav className="lp-nav-links">
            <a href="#pilot">Suivi</a>
            <a href="#features">Fonctionnalités</a>
            <a href="#security">Sécurité</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-actions">
            <button onClick={onSignIn} className="lp-nav-login">Connexion</button>
            <button onClick={onSignUp} className="lp-nav-cta">S'inscrire</button>
          </div>
        </div>
      </header>

      {/* === HERO === */}
      <section className="lp-hero">
        <div className="lp-eyebrow-pill">PATRIMOINE FAMILIAL · DSP2 · UE</div>
        <h1 className="lp-h1">
          Suivre. Comprendre.<br/><em>Décider.</em>
        </h1>
        <p className="lp-sub">
          Wealthly agrège vos comptes, actifs, dettes et charges fixes — par
          membre du foyer, sur un seul écran. Sans démarchage, sans revente
          de données.
        </p>
        <div className="lp-cta-row">
          <button onClick={onSignUp} className="lp-cta-primary">
            Démarrer gratuitement <ArrowRight size={16}/>
          </button>
          <button onClick={onTryDemo} className="lp-cta-ghost">
            <Sparkles size={14}/> Voir avec un jeu de démo
          </button>
        </div>
        <div className="lp-trust">
          <div className="lp-trust-item"><strong>17</strong><span>tables<br/>relationnelles</span></div>
          <div className="lp-trust-sep"/>
          <div className="lp-trust-item"><strong>1 900<sup>+</sup></strong><span>banques UE<br/>via DSP2</span></div>
          <div className="lp-trust-sep"/>
          <div className="lp-trust-item"><strong>FR · EN</strong><span>interface<br/>bilingue</span></div>
          <div className="lp-trust-sep"/>
          <div className="lp-trust-item"><strong>0</strong><span>tracker<br/>tiers</span></div>
        </div>

        {/* Hero screenshot */}
        <div className="lp-hero-shot">
          <div className="lp-shot-frame">
            <div className="lp-shot-chrome">
              <span className="dot"/><span className="dot"/><span className="dot"/>
              <span className="lp-shot-url">wealthly.app / résumé</span>
            </div>
            <img src="/landing/hero-dashboard.png" alt="Tableau de bord Wealthly"/>
          </div>
        </div>
      </section>

      {/* === PILOT — 2 col text+image === */}
      <section className="lp-pilot" id="pilot">
        <div className="lp-pilot-text">
          <div className="lp-eyebrow gold">SUIVI AUTOMATIQUE</div>
          <h2 className="lp-h2">Votre patrimoine,<br/><em>en pilote auto.</em></h2>
          <p className="lp-p">
            On ne peut pas améliorer ce qu'on ne suit pas. Wealthly synchronise
            vos comptes via la DSP2 et calcule en temps réel votre patrimoine net,
            décliné par membre du foyer.
          </p>
          <ul className="lp-bullets">
            <li>
              <span className="lp-bullet-icon"><Users size={15}/></span>
              <div>
                <strong>Multi-membres natif</strong>
                <span>Une vue par personne, une vue famille. Comptes joints, comptes perso, enfants — tout reste lisible.</span>
              </div>
            </li>
            <li>
              <span className="lp-bullet-icon"><Building2 size={15}/></span>
              <div>
                <strong>Synchro DSP2 agréée</strong>
                <span>Connectable à 1 900+ banques européennes via GoCardless, en lecture seule.</span>
              </div>
            </li>
            <li>
              <span className="lp-bullet-icon"><Activity size={15}/></span>
              <div>
                <strong>Snapshot mensuel auto</strong>
                <span>Voyez l'évolution mois après mois sans saisie manuelle.</span>
              </div>
            </li>
          </ul>
          <button onClick={onSignUp} className="lp-cta-primary">
            Créer mon compte <ArrowRight size={16}/>
          </button>
        </div>
        <div className="lp-pilot-shot">
          <div className="lp-shot-frame tall">
            <img src="/landing/feature-sidebar.png" alt="Navigation Wealthly"/>
          </div>
        </div>
      </section>

      {/* === BENTO — 3 features each with a real screenshot === */}
      <section className="lp-bento" id="features">
        <div className="lp-section-head">
          <div className="lp-eyebrow gold">OPTIMISEZ VOTRE PATRIMOINE</div>
          <h2 className="lp-h2">Trois outils pour <em>décider mieux.</em></h2>
          <p className="lp-p">
            Score santé, cashflow, simulateur fiscal — tout est calculé localement,
            sans envoyer vos données ailleurs.
          </p>
        </div>

        <div className="lp-bento-grid">
          <article className="lp-bento-card">
            <div className="lp-bento-text">
              <div className="lp-bento-icon"><Activity size={18}/></div>
              <h3>Score santé financière</h3>
              <p>Note 0–100 sur 5 critères pondérés : taux d'épargne, fonds d'urgence, ratio d'endettement, diversification, respect des budgets.</p>
            </div>
            <div className="lp-bento-shot">
              <img src="/landing/feature-health.png" alt="Score santé financière"/>
            </div>
          </article>

          <article className="lp-bento-card">
            <div className="lp-bento-text">
              <div className="lp-bento-icon"><BarChart3 size={18}/></div>
              <h3>Cashflow visuel</h3>
              <p>Sankey et donut pour comprendre où va chaque euro. Détection automatique des charges fixes récurrentes.</p>
            </div>
            <div className="lp-bento-shot">
              <img src="/landing/feature-cashflow.png" alt="Cashflow Sankey"/>
            </div>
          </article>

          <article className="lp-bento-card">
            <div className="lp-bento-text">
              <div className="lp-bento-icon"><Calculator size={18}/></div>
              <h3>Simulateur d'impôt FR</h3>
              <p>Barème 2025, parts, plafond quotient, décote, crédits garde et CESU, plafond niches 10 000 €.</p>
            </div>
            <div className="lp-bento-shot">
              <img src="/landing/feature-tax.png" alt="Simulateur d'impôt"/>
            </div>
          </article>
        </div>
      </section>

      {/* === SECURITY === */}
      <section className="lp-security" id="security">
        <div className="lp-section-head">
          <div className="lp-eyebrow gold">SÉCURITÉ</div>
          <h2 className="lp-h2">La confidentialité est<br/><em>la valeur par défaut.</em></h2>
        </div>
        <div className="lp-sec-grid">
          <div className="lp-sec-item">
            <span className="lp-sec-icon"><ShieldCheck size={20}/></span>
            <strong>Synchro DSP2 agréée</strong>
            <span>via GoCardless Bank Account Data, en lecture seule. Wealthly n'a jamais vos identifiants bancaires.</span>
          </div>
          <div className="lp-sec-item">
            <span className="lp-sec-icon"><MapPin size={20}/></span>
            <strong>Hébergé en UE</strong>
            <span>Infra Vercel + Railway, base Postgres Supabase Europe, chiffrement at-rest.</span>
          </div>
          <div className="lp-sec-item">
            <span className="lp-sec-icon"><EyeOff size={20}/></span>
            <strong>Zéro tracker tiers</strong>
            <span>Pas d'analytics, pas de revente, pas de publicité. Le modèle économique n'est pas vos données.</span>
          </div>
          <div className="lp-sec-item">
            <span className="lp-sec-icon"><Lock size={20}/></span>
            <strong>Bcrypt + JWT 7 jours</strong>
            <span>HTTPS partout, rate-limiting sur l'auth, mot de passe oublié à usage unique.</span>
          </div>
        </div>
      </section>

      {/* === 3 STEPS === */}
      <section className="lp-steps">
        <div className="lp-section-head">
          <div className="lp-eyebrow gold">EN 3 ÉTAPES</div>
          <h2 className="lp-h2">Démarrez en moins<br/><em>d'une minute.</em></h2>
        </div>
        <div className="lp-steps-grid">
          <div className="lp-step">
            <div className="lp-step-num">01</div>
            <h3>Créez votre compte</h3>
            <p>Email + mot de passe. Pas de carte bleue, pas d'engagement.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">02</div>
            <h3>Connectez vos comptes</h3>
            <p>DSP2 en 1 clic ou import CSV en 4 étapes guidées.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">03</div>
            <h3>Pilotez votre foyer</h3>
            <p>Score santé, cashflow, simulateur d'impôt — tout dans un écran.</p>
          </div>
        </div>
        <div className="lp-steps-cta">
          <button onClick={onSignUp} className="lp-cta-primary lp-cta-large">
            Créer mon compte <ArrowRight size={16}/>
          </button>
        </div>
      </section>

      {/* === FAQ === */}
      <section className="lp-faq" id="faq">
        <div className="lp-section-head">
          <div className="lp-eyebrow gold">QUESTIONS FRÉQUENTES</div>
          <h2 className="lp-h2"><em>Une question ?</em></h2>
        </div>
        <div className="lp-faq-list">
          <details className="lp-faq-q">
            <summary>Wealthly est-il gratuit ? <ChevronDown size={16}/></summary>
            <p>Oui. Le code est open source (MIT) sur GitHub, l'instance hébergée est gratuite pendant la bêta. Aucun paywall sur les features patrimoniales, fiscales ou bancaires.</p>
          </details>
          <details className="lp-faq-q">
            <summary>Mes données bancaires sont-elles en sécurité ? <ChevronDown size={16}/></summary>
            <p>Wealthly n'a <strong>jamais</strong> vos identifiants bancaires. La connexion DSP2 passe par GoCardless Bank Account Data, prestataire agréé, en lecture seule. La base est hébergée chez Supabase en Union européenne, chiffrée at-rest.</p>
          </details>
          <details className="lp-faq-q">
            <summary>Puis-je auto-héberger ? <ChevronDown size={16}/></summary>
            <p>Oui — le code est public. Backend FastAPI + Postgres, frontend Vite. Déploiement Railway + Vercel documenté dans le repo. Comptez 30 minutes pour une instance perso.</p>
          </details>
          <details className="lp-faq-q">
            <summary>Quelles banques sont supportées ? <ChevronDown size={16}/></summary>
            <p>1 900+ banques européennes via la DSP2 (Boursorama, BNP, Crédit Agricole, Société Générale, Revolut, N26, Lydia, Trade Republic…). Pour les comptes hors-DSP2 (compte titres niche, courtier US), import CSV en 4 étapes guidées.</p>
          </details>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="lp-foot">
        <div className="lp-foot-grid">
          <div className="lp-foot-col lp-foot-brand">
            <div className="lp-brand">
              <span className="lp-brand-mark"><Wmark size={16}/></span>
              <span className="lp-brand-name">Wealthly</span>
            </div>
            <p className="lp-foot-tag">Patrimoine familial,<br/>sans démarchage.</p>
          </div>
          <div className="lp-foot-col">
            <h4>Produit</h4>
            <button onClick={onSignUp}>S'inscrire</button>
            <button onClick={onSignIn}>Connexion</button>
            <button onClick={onTryDemo}>Voir une démo</button>
          </div>
          <div className="lp-foot-col">
            <h4>Sections</h4>
            <a href="#pilot">Suivi</a>
            <a href="#features">Fonctionnalités</a>
            <a href="#security">Sécurité</a>
            <a href="#faq">FAQ</a>
          </div>
          <div className="lp-foot-col">
            <h4>Ressources</h4>
            <a href="https://github.com/Raphyy31/wealthly" target="_blank" rel="noopener noreferrer">
              <Github size={13}/> GitHub
            </a>
            <a href="mailto:contact@wealthly.app">
              <Mail size={13}/> Contact
            </a>
          </div>
        </div>
        <div className="lp-foot-bottom">
          <span>
            © 2026 Wealthly —{' '}
            <button className="lp-legal-link" onClick={() => setLegal('cgu')}>CGU</button>
            {' · '}
            <button className="lp-legal-link" onClick={() => setLegal('privacy')}>Confidentialité</button>
          </span>
          <span className="lp-foot-disclaim">Wealthly ne fournit aucun conseil en investissement. Les outils proposés sont à but informatif.</span>
        </div>
      </footer>

      {legal && <LegalModal section={legal} onClose={() => setLegal(null)} />}

      <style>{styles}</style>
    </div>
  );
}

const styles = `
.lp {
  background: #0a0b0e;
  color: #ebe8e3;
  font-family: 'DM Sans', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em;
  min-height: 100vh;
  overflow-x: hidden;
  scroll-behavior: smooth;
}
.lp * { box-sizing: border-box; }

/* ---------- shared ---------- */
.lp-eyebrow, .lp-eyebrow-pill {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.22em;
  color: #c5a572;
}
.lp-eyebrow.gold { color: #c5a572; }
.lp-eyebrow-pill {
  display: inline-block;
  padding: 7px 16px;
  border: 1px solid rgba(197, 165, 114, 0.3);
  border-radius: 999px;
  background: rgba(197, 165, 114, 0.05);
  margin-bottom: 22px;
}
.lp-h1 {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: clamp(44px, 7.4vw, 92px);
  font-weight: 400;
  letter-spacing: -0.022em; line-height: 1.02;
  color: #ebe8e3; margin: 0 0 22px;
}
.lp-h1 em { font-style: italic; color: #c5a572; font-weight: 400; }
.lp-h2 {
  font-family: 'Source Serif 4', Georgia, serif;
  font-size: clamp(32px, 4.8vw, 54px);
  font-weight: 400;
  letter-spacing: -0.018em; line-height: 1.08;
  color: #ebe8e3; margin: 14px 0 18px;
}
.lp-h2 em { font-style: italic; color: #c5a572; font-weight: 400; }
.lp-p, .lp-sub {
  font-size: 16px; line-height: 1.65;
  color: #b5b2ab;
  letter-spacing: -0.005em;
}
.lp-sub { font-size: clamp(15px, 1.5vw, 18px); max-width: 600px; margin: 0 auto 32px; }
.lp-section-head { text-align: center; max-width: 720px; margin: 0 auto 56px; }
.lp-section-head .lp-p { margin-top: 8px; }

/* ---------- CTAs ---------- */
.lp-cta-row {
  display: inline-flex; flex-wrap: wrap; gap: 14px; justify-content: center;
  margin-bottom: 56px;
}
.lp-cta-primary {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 24px;
  background: #c5a572;
  color: #0a0b0e;
  border: none;
  border-radius: 8px;
  font-family: inherit; font-size: 14px; font-weight: 600;
  letter-spacing: 0.005em;
  cursor: pointer;
  transition: background .15s, box-shadow .15s, transform .05s;
  box-shadow: 0 8px 24px -8px rgba(197, 165, 114, 0.5);
}
.lp-cta-primary:hover { background: #d4b687; box-shadow: 0 10px 28px -8px rgba(197, 165, 114, 0.7); }
.lp-cta-primary:active { transform: translateY(1px); }
.lp-cta-large { padding: 16px 28px; font-size: 15px; }
.lp-cta-ghost {
  display: inline-flex; align-items: center; gap: 8px;
  padding: 14px 22px;
  background: transparent;
  color: #ebe8e3;
  border: 1px solid rgba(255,255,255,0.12);
  border-radius: 8px;
  font-family: inherit; font-size: 14px; font-weight: 500;
  cursor: pointer;
  transition: background .15s, border-color .15s;
}
.lp-cta-ghost:hover { background: rgba(255,255,255,0.04); border-color: rgba(255,255,255,0.22); }
.lp-cta-ghost svg { color: #c5a572; }

/* ---------- NAV ---------- */
.lp-nav {
  position: sticky; top: 0; z-index: 50;
  backdrop-filter: blur(16px) saturate(180%);
  -webkit-backdrop-filter: blur(16px) saturate(180%);
  background: rgba(10, 11, 14, 0.82);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.lp-nav-inner {
  max-width: 1200px; margin: 0 auto;
  display: flex; align-items: center; justify-content: space-between;
  padding: 14px 32px;
}
.lp-brand {
  display: inline-flex; align-items: center; gap: 10px;
  font-size: 16px; font-weight: 600; color: #ebe8e3;
  letter-spacing: -0.01em;
}
.lp-brand-mark {
  display: inline-flex; align-items: center; justify-content: center;
  width: 30px; height: 30px;
  border-radius: 7px;
  background: rgba(197, 165, 114, 0.1);
  border: 1px solid rgba(197, 165, 114, 0.32);
  color: #c5a572;
}
.lp-nav-links {
  display: flex; gap: 28px;
}
.lp-nav-links a {
  font-size: 13.5px; font-weight: 500;
  color: #a8a59f; text-decoration: none;
  transition: color .15s;
}
.lp-nav-links a:hover { color: #ebe8e3; }
.lp-nav-actions { display: inline-flex; gap: 10px; align-items: center; }
.lp-nav-login {
  background: transparent; border: none;
  color: #c5a572; font-family: inherit;
  font-size: 13.5px; font-weight: 500; cursor: pointer;
  padding: 8px 12px;
  transition: color .15s;
}
.lp-nav-login:hover { color: #d4b687; }
.lp-nav-cta {
  background: #c5a572; color: #0a0b0e;
  border: none; border-radius: 7px;
  padding: 9px 16px;
  font-family: inherit; font-size: 13.5px; font-weight: 600;
  cursor: pointer;
  transition: background .15s;
}
.lp-nav-cta:hover { background: #d4b687; }

/* ---------- HERO ---------- */
.lp-hero {
  position: relative;
  max-width: 1200px; margin: 0 auto;
  padding: 80px 32px 100px;
  text-align: center;
}
.lp-hero::before {
  content: '';
  position: absolute; inset: -120px 0 auto 0;
  height: 600px;
  background:
    radial-gradient(ellipse 60% 60% at 50% 30%, rgba(197, 165, 114, 0.16), transparent 70%),
    radial-gradient(ellipse 40% 30% at 30% 60%, rgba(197, 165, 114, 0.05), transparent 65%);
  pointer-events: none; z-index: 0;
}
.lp-hero > * { position: relative; z-index: 1; }
.lp-trust {
  display: inline-flex; align-items: center; gap: 0;
  margin: 0 auto 64px;
  padding: 16px 0;
}
.lp-trust-item {
  display: flex; flex-direction: column; align-items: center;
  padding: 0 28px;
  text-align: center;
}
.lp-trust-item strong {
  font-size: 26px; font-weight: 700; color: #c5a572;
  letter-spacing: -0.02em; line-height: 1;
  font-variant-numeric: tabular-nums;
}
.lp-trust-item strong sup { font-size: 16px; opacity: 0.7; }
.lp-trust-item span {
  font-size: 11px; color: #8c8a85; line-height: 1.35;
  margin-top: 8px;
  text-transform: uppercase; letter-spacing: 0.14em;
}
.lp-trust-sep {
  width: 1px; height: 32px;
  background: rgba(255,255,255,0.08);
}
.lp-hero-shot {
  margin: 0 auto;
  max-width: 1100px;
  position: relative;
}
.lp-hero-shot::before {
  content: '';
  position: absolute; inset: -60px;
  background: radial-gradient(ellipse 70% 50% at 50% 50%, rgba(197, 165, 114, 0.18), transparent 70%);
  pointer-events: none;
}

/* ---------- shared shot frame ---------- */
.lp-shot-frame {
  position: relative;
  background: #11131a;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
  overflow: hidden;
  box-shadow:
    0 50px 120px -40px rgba(0,0,0,0.8),
    0 0 0 1px rgba(197, 165, 114, 0.06) inset;
}
.lp-shot-chrome {
  display: flex; align-items: center; gap: 6px;
  padding: 11px 14px;
  background: #0d0f14;
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.lp-shot-chrome .dot {
  width: 10px; height: 10px; border-radius: 50%;
  background: #2a2d36;
}
.lp-shot-chrome .dot:nth-child(1) { background: #c47158; }
.lp-shot-chrome .dot:nth-child(2) { background: #d4a554; }
.lp-shot-chrome .dot:nth-child(3) { background: #88a978; }
.lp-shot-url {
  margin-left: 14px;
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 11px; color: #6e6a64;
  letter-spacing: 0.02em;
}
.lp-shot-frame img {
  display: block; width: 100%; height: auto;
}
.lp-shot-frame.tall img { object-fit: cover; }

/* ---------- PILOT (2 col) ---------- */
.lp-pilot {
  max-width: 1200px; margin: 0 auto;
  padding: 100px 32px;
  display: grid; grid-template-columns: 1.1fr 0.9fr;
  gap: 80px; align-items: center;
}
.lp-pilot-text .lp-h2 { margin-top: 14px; }
.lp-pilot-text .lp-p { margin-bottom: 28px; max-width: 480px; }
.lp-bullets { list-style: none; padding: 0; margin: 0 0 32px; display: flex; flex-direction: column; gap: 18px; }
.lp-bullets li { display: flex; gap: 14px; align-items: flex-start; }
.lp-bullet-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 32px; height: 32px;
  background: rgba(197, 165, 114, 0.1);
  border: 1px solid rgba(197, 165, 114, 0.28);
  border-radius: 8px;
  color: #c5a572;
  flex-shrink: 0;
}
.lp-bullets li > div { display: flex; flex-direction: column; gap: 3px; }
.lp-bullets li strong {
  font-size: 14px; color: #ebe8e3; font-weight: 600;
  letter-spacing: -0.01em;
}
.lp-bullets li span {
  font-size: 13.5px; color: #a8a59f; line-height: 1.55;
}
.lp-pilot-shot { display: flex; justify-content: center; }
.lp-pilot-shot .lp-shot-frame { max-width: 360px; }

/* ---------- BENTO ---------- */
.lp-bento {
  max-width: 1200px; margin: 0 auto;
  padding: 100px 32px;
}
.lp-bento-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 20px;
}
.lp-bento-card {
  background: #13151a;
  border: 1px solid rgba(255,255,255,0.07);
  border-radius: 14px;
  overflow: hidden;
  display: flex; flex-direction: column;
  transition: border-color .2s, transform .2s;
}
.lp-bento-card:hover {
  border-color: rgba(197, 165, 114, 0.3);
}
.lp-bento-text { padding: 28px 26px 20px; }
.lp-bento-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 38px; height: 38px;
  background: rgba(197, 165, 114, 0.1);
  border: 1px solid rgba(197, 165, 114, 0.28);
  border-radius: 9px;
  color: #c5a572;
  margin-bottom: 16px;
}
.lp-bento-card h3 {
  font-size: 17px; font-weight: 600;
  letter-spacing: -0.015em; color: #ebe8e3;
  margin: 0 0 8px;
}
.lp-bento-card p {
  font-size: 13.5px; color: #a8a59f; line-height: 1.55;
  margin: 0;
}
.lp-bento-shot {
  margin: 8px 14px 14px;
  background: #0a0b0e;
  border: 1px solid rgba(255,255,255,0.05);
  border-radius: 10px;
  overflow: hidden;
  height: 220px;
  display: flex; align-items: stretch;
}
.lp-bento-shot img {
  width: 100%; height: 100%;
  object-fit: cover; object-position: center top;
  display: block;
}

/* ---------- SECURITY ---------- */
.lp-security {
  max-width: 1200px; margin: 0 auto;
  padding: 100px 32px;
}
.lp-sec-grid {
  display: grid; grid-template-columns: repeat(4, 1fr);
  gap: 16px;
}
.lp-sec-item {
  display: flex; flex-direction: column; gap: 10px;
  padding: 24px 22px;
  background: #13151a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 12px;
  transition: border-color .15s;
}
.lp-sec-item:hover { border-color: rgba(197, 165, 114, 0.25); }
.lp-sec-icon {
  display: inline-flex; align-items: center; justify-content: center;
  width: 40px; height: 40px;
  background: rgba(197, 165, 114, 0.08);
  border-radius: 10px;
  color: #c5a572;
  margin-bottom: 6px;
}
.lp-sec-item strong {
  font-size: 14.5px; font-weight: 600;
  color: #ebe8e3; letter-spacing: -0.01em;
}
.lp-sec-item span {
  font-size: 12.5px; color: #a8a59f; line-height: 1.55;
}

/* ---------- STEPS ---------- */
.lp-steps {
  max-width: 1100px; margin: 0 auto;
  padding: 100px 32px;
  text-align: center;
}
.lp-steps-grid {
  display: grid; grid-template-columns: repeat(3, 1fr);
  gap: 28px;
  margin-bottom: 56px;
  text-align: left;
}
.lp-step {
  padding: 28px;
  background: #13151a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 14px;
  position: relative;
}
.lp-step-num {
  font-family: 'DM Mono', ui-monospace, monospace;
  font-size: 13px; font-weight: 700;
  color: #c5a572;
  letter-spacing: 0.06em;
  margin-bottom: 18px;
  display: inline-flex; align-items: center; justify-content: center;
  width: 36px; height: 36px;
  background: rgba(197, 165, 114, 0.08);
  border: 1px solid rgba(197, 165, 114, 0.28);
  border-radius: 8px;
}
.lp-step h3 {
  font-size: 16px; font-weight: 600;
  color: #ebe8e3; letter-spacing: -0.01em;
  margin: 0 0 8px;
}
.lp-step p {
  font-size: 13.5px; color: #a8a59f; line-height: 1.55;
  margin: 0;
}
.lp-steps-cta { margin-top: 20px; }

/* ---------- FAQ ---------- */
.lp-faq {
  max-width: 800px; margin: 0 auto;
  padding: 100px 32px;
}
.lp-faq-list { display: flex; flex-direction: column; gap: 12px; }
.lp-faq-q {
  background: #13151a;
  border: 1px solid rgba(255,255,255,0.06);
  border-radius: 10px;
  padding: 0 22px;
  transition: border-color .15s;
}
.lp-faq-q:hover { border-color: rgba(197, 165, 114, 0.18); }
.lp-faq-q[open] { border-color: rgba(197, 165, 114, 0.28); }
.lp-faq-q summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 0;
  font-size: 14.5px; font-weight: 500;
  color: #ebe8e3; cursor: pointer;
  list-style: none;
  letter-spacing: -0.005em;
}
.lp-faq-q summary::-webkit-details-marker { display: none; }
.lp-faq-q summary svg { color: #6e6a64; transition: transform .2s; }
.lp-faq-q[open] summary svg { transform: rotate(180deg); color: #c5a572; }
.lp-faq-q p {
  font-size: 13.5px; color: #a8a59f; line-height: 1.65;
  margin: 0 0 18px; max-width: 680px;
}
.lp-faq-q p strong { color: #ebe8e3; font-weight: 600; }

/* ---------- FOOTER ---------- */
.lp-foot {
  border-top: 1px solid rgba(255,255,255,0.06);
  padding: 64px 32px 28px;
  background: #08090c;
}
.lp-foot-grid {
  max-width: 1200px; margin: 0 auto;
  display: grid; grid-template-columns: 1.5fr 1fr 1fr 1fr;
  gap: 48px;
  margin-bottom: 48px;
}
.lp-foot-col { display: flex; flex-direction: column; gap: 10px; }
.lp-foot-col h4 {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.18em;
  color: #6e6a64;
  margin: 0 0 6px;
}
.lp-foot-col a, .lp-foot-col button {
  display: inline-flex; align-items: center; gap: 6px;
  font-size: 13px; font-weight: 500;
  color: #a8a59f; text-decoration: none;
  background: none; border: none; padding: 0; cursor: pointer;
  font-family: inherit;
  text-align: left;
  transition: color .15s;
}
.lp-foot-col a:hover, .lp-foot-col button:hover { color: #c5a572; }
.lp-foot-tag { font-size: 13px; color: #8c8a85; line-height: 1.55; margin: 8px 0 0; }
.lp-foot-bottom {
  max-width: 1200px; margin: 0 auto;
  padding-top: 24px;
  border-top: 1px solid rgba(255,255,255,0.05);
  display: flex; justify-content: space-between; flex-wrap: wrap; gap: 14px;
  font-size: 11.5px; color: #5a5a55;
}
.lp-foot-disclaim { max-width: 580px; text-align: right; line-height: 1.5; }
.lp-legal-link {
  background: none; border: none; padding: 0; cursor: pointer;
  color: #5a5a55; font-size: inherit; font-family: inherit;
  transition: color .15s;
}
.lp-legal-link:hover { color: #c5a572; }

/* ---------- responsive ---------- */
@media (max-width: 980px) {
  .lp-pilot { grid-template-columns: 1fr; gap: 48px; padding: 64px 24px; }
  .lp-pilot-shot .lp-shot-frame { max-width: 280px; }
  .lp-bento-grid { grid-template-columns: 1fr; }
  .lp-sec-grid { grid-template-columns: repeat(2, 1fr); }
  .lp-steps-grid { grid-template-columns: 1fr; gap: 16px; }
  .lp-foot-grid { grid-template-columns: 1fr 1fr; gap: 32px; }
}
@media (max-width: 700px) {
  .lp-nav-links { display: none; }
  .lp-hero { padding: 56px 20px 64px; }
  .lp-trust { flex-wrap: wrap; gap: 16px; }
  .lp-trust-sep { display: none; }
  .lp-trust-item { padding: 0 14px; }
  .lp-bento, .lp-security, .lp-steps, .lp-faq { padding: 64px 20px; }
  .lp-section-head { margin-bottom: 36px; }
  .lp-sec-grid { grid-template-columns: 1fr; }
  .lp-foot-grid { grid-template-columns: 1fr; }
  .lp-foot-bottom { flex-direction: column; }
  .lp-foot-disclaim { text-align: left; }
  .lp-cta-row { flex-direction: column; align-items: stretch; }
}
`;
