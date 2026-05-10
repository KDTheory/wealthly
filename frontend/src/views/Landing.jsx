// ============================================================================
// Landing — public marketing page (Wealthly rebrand)
//
// Modern fintech landing: sticky nav → hero with gradient mesh → "comment
// ça marche" 3-step → features bento → security → pricing tiers → FAQ →
// footer. Inline CSS-in-JS for portability (matches AuthScreen pattern).
// ============================================================================
import React, { useState } from 'react';
import {
  ArrowRight, ShieldCheck, MapPin, EyeOff, Users, Building2, Calculator,
  Activity, Github, Mail, ChevronDown, Lock, Sparkles, BarChart3, Calendar,
  Check, Zap, Wallet, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import { LegalModal } from '../components/LegalModal.jsx';

const Tmark = ({ size = 22 }) => (
  <span
    style={{
      width: size + 14, height: size + 14,
      display: 'inline-grid', placeItems: 'center',
      background: 'linear-gradient(135deg, #5285ee 0%, #3b6fe0 50%, #7d5cf0 100%)',
      borderRadius: 9,
      color: 'white',
      fontWeight: 800,
      fontSize: size - 2,
      letterSpacing: '-0.04em',
      boxShadow: '0 4px 14px rgba(59,111,224,0.35), inset 0 1px 0 rgba(255,255,255,0.20)',
      border: '1px solid rgba(255,255,255,0.10)',
    }}
  >
    T
  </span>
);

export default function Landing({ onSignIn, onSignUp, onTryDemo }) {
  const [legal, setLegal] = useState(null);
  const [billing, setBilling] = useState('monthly'); // 'monthly' | 'yearly'

  return (
    <div className="lp">
      {/* === NAV === */}
      <header className="lp-nav">
        <div className="lp-nav-inner">
          <div className="lp-brand">
            <Tmark size={18}/>
            <span className="lp-brand-name">Wealthly</span>
          </div>
          <nav className="lp-nav-links">
            <a href="#how">Fonctionnement</a>
            <a href="#features">Fonctionnalités</a>
            <a href="#pricing">Tarifs</a>
            <a href="#security">Sécurité</a>
            <a href="#faq">FAQ</a>
          </nav>
          <div className="lp-nav-actions">
            <button onClick={onSignIn} className="lp-nav-login">Connexion</button>
            <button onClick={onSignUp} className="lp-nav-cta">Commencer</button>
          </div>
        </div>
      </header>

      {/* === HERO === */}
      <section className="lp-hero">
        <div className="lp-hero-mesh" aria-hidden="true"/>
        <div className="lp-eyebrow-pill">
          <span className="lp-eyebrow-dot"/> Nouveau · pilotez votre patrimoine en équipe
        </div>
        <h1 className="lp-h1">
          Le patrimoine de votre famille,<br/>
          <span className="lp-h1-grad">enfin clair.</span>
        </h1>
        <p className="lp-sub">
          Wealthly rassemble vos comptes, placements, biens et dettes dans un
          tableau de bord moderne. Compris en 30 secondes, partagé entre membres
          du foyer, sécurisé en Europe.
        </p>
        <div className="lp-cta-row">
          <button onClick={onSignUp} className="lp-cta-primary">
            Démarrer gratuitement <ArrowRight size={16}/>
          </button>
          <button onClick={onTryDemo} className="lp-cta-ghost">
            <Sparkles size={14}/> Voir la démo
          </button>
        </div>
        <div className="lp-trust">
          <div className="lp-trust-item">
            <strong>1 900<sup>+</sup></strong>
            <span>banques connectées<br/>via DSP2</span>
          </div>
          <div className="lp-trust-sep"/>
          <div className="lp-trust-item">
            <strong>0</strong>
            <span>tracker tiers<br/>aucune revente</span>
          </div>
          <div className="lp-trust-sep"/>
          <div className="lp-trust-item">
            <strong>UE</strong>
            <span>hébergement<br/>chiffré at-rest</span>
          </div>
          <div className="lp-trust-sep"/>
          <div className="lp-trust-item">
            <strong>4,8/5</strong>
            <span>premiers retours<br/>utilisateurs</span>
          </div>
        </div>

        <div className="lp-hero-shot">
          <div className="lp-shot-frame">
            <img src="/landing/hero-dashboard.png" alt="Tableau de bord Wealthly"/>
          </div>
        </div>
      </section>

      {/* === HOW IT WORKS === */}
      <section id="how" className="lp-section">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Fonctionnement</div>
          <h2 className="lp-h2">Trois étapes, dix minutes.</h2>
          <p className="lp-section-sub">
            Importez ce que vous avez déjà, laissez Wealthly faire le reste.
          </p>
        </div>
        <div className="lp-steps">
          <div className="lp-step">
            <div className="lp-step-num">1</div>
            <h3>Connectez vos comptes</h3>
            <p>Synchro DSP2 en lecture seule via GoCardless, ou import CSV de vos relevés. Aucun identifiant bancaire ne transite par Wealthly.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">2</div>
            <h3>Ajoutez vos actifs et dettes</h3>
            <p>Immobilier, PEA, livrets, crypto, prêts. Saisie guidée pour chaque type, ou import depuis votre courtier.</p>
          </div>
          <div className="lp-step">
            <div className="lp-step-num">3</div>
            <h3>Pilotez en famille</h3>
            <p>Invitez votre conjoint, attribuez les biens par membre, suivez votre patrimoine net consolidé en temps réel.</p>
          </div>
        </div>
      </section>

      {/* === FEATURES === */}
      <section id="features" className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Fonctionnalités</div>
          <h2 className="lp-h2">Toute la finance familiale, sans la complexité.</h2>
        </div>
        <div className="lp-bento">
          <div className="lp-bento-card lp-bento-large">
            <div className="lp-bento-icon" style={{ background: 'rgba(59,111,224,0.16)', color: '#7aa3ff' }}>
              <BarChart3 size={20}/>
            </div>
            <h3>Patrimoine net consolidé</h3>
            <p>Comptes courants, placements, immobilier, dettes — tout dans une vue unique avec performance 30j/3M/YTD.</p>
            <img src="/landing/hero-dashboard.png" alt="Patrimoine net consolidé Wealthly"/>
          </div>
          <div className="lp-bento-card">
            <div className="lp-bento-icon" style={{ background: 'rgba(52,211,153,0.16)', color: '#34d399' }}>
              <Activity size={18}/>
            </div>
            <h3>Suivi mensuel</h3>
            <p>Charges fixes, taux d'épargne, budgets par catégorie avec alertes.</p>
            <img src="/landing/feature-cashflow.png" alt="Suivi mensuel"/>
          </div>
          <div className="lp-bento-card">
            <div className="lp-bento-icon" style={{ background: 'rgba(251,191,36,0.16)', color: '#fbbf24' }}>
              <Calculator size={18}/>
            </div>
            <h3>Simulateur d'impôts FR</h3>
            <p>Barème 2025, parts fiscales, crédits d'impôt, optimisation des plafonds.</p>
            <img src="/landing/feature-tax.png" alt="Simulateur d'impôts"/>
          </div>
          <div className="lp-bento-card">
            <div className="lp-bento-icon" style={{ background: 'rgba(167,139,250,0.16)', color: '#a78bfa' }}>
              <Users size={18}/>
            </div>
            <h3>Multi-membres</h3>
            <p>Conjoint, enfants, parents — chacun avec sa part dans les biens partagés.</p>
            <img src="/landing/feature-sidebar.png" alt="Multi-membres"/>
          </div>
          <div className="lp-bento-card">
            <div className="lp-bento-icon" style={{ background: 'rgba(91,141,239,0.16)', color: '#7aa3ff' }}>
              <TrendingUp size={18}/>
            </div>
            <h3>Score patrimoine</h3>
            <p>Note 0–100 sur 5 critères : épargne, diversification, dette, performance, liquidité.</p>
            <img src="/landing/feature-health.png" alt="Score patrimoine"/>
          </div>
        </div>
      </section>

      {/* === SECURITY === */}
      <section id="security" className="lp-section lp-security">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Sécurité</div>
          <h2 className="lp-h2">Vos données restent les vôtres.</h2>
          <p className="lp-section-sub">
            Wealthly ne revend rien, ne profile pas, ne pose aucun tracker tiers.
          </p>
        </div>
        <div className="lp-security-grid">
          <div className="lp-security-item">
            <Lock size={18}/>
            <div>
              <h4>Lecture seule</h4>
              <p>Synchro DSP2 via GoCardless, prestataire agréé. Wealthly n'a jamais vos identifiants bancaires.</p>
            </div>
          </div>
          <div className="lp-security-item">
            <MapPin size={18}/>
            <div>
              <h4>Hébergé en UE</h4>
              <p>Base Postgres chez Supabase Europe, chiffrement at-rest, sauvegardes automatiques.</p>
            </div>
          </div>
          <div className="lp-security-item">
            <EyeOff size={18}/>
            <div>
              <h4>Aucun tracker</h4>
              <p>Pas de Google Analytics, pas de Meta Pixel, pas de cookie publicitaire. Un JWT en localStorage, c'est tout.</p>
            </div>
          </div>
          <div className="lp-security-item">
            <Github size={18}/>
            <div>
              <h4>Open source</h4>
              <p>Le code est public sur GitHub. Vous pouvez auditer, contribuer, ou auto-héberger.</p>
            </div>
          </div>
        </div>
      </section>

      {/* === PRICING === */}
      <section id="pricing" className="lp-section lp-section-alt">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Tarifs</div>
          <h2 className="lp-h2">Un prix juste, un essai sans carte.</h2>
          <p className="lp-section-sub">
            Commencez gratuitement, passez Pro quand vous en avez besoin. Aucun engagement.
          </p>
          <div className="lp-billing-toggle">
            <button
              onClick={() => setBilling('monthly')}
              className={billing === 'monthly' ? 'active' : ''}
            >
              Mensuel
            </button>
            <button
              onClick={() => setBilling('yearly')}
              className={billing === 'yearly' ? 'active' : ''}
            >
              Annuel <span className="lp-badge-save">−20 %</span>
            </button>
          </div>
        </div>

        <div className="lp-pricing-grid">

          {/* FREE */}
          <div className="lp-price-card">
            <div className="lp-price-name">Solo</div>
            <div className="lp-price-tagline">Pour démarrer en douceur</div>
            <div className="lp-price-amount">
              <span className="lp-price-num">0</span>
              <span className="lp-price-currency">€</span>
              <span className="lp-price-period">/ pour toujours</span>
            </div>
            <button onClick={onSignUp} className="lp-price-cta lp-price-cta-ghost">Démarrer gratuitement</button>
            <ul className="lp-price-features">
              <li><Check size={14}/> 1 utilisateur</li>
              <li><Check size={14}/> 3 comptes bancaires</li>
              <li><Check size={14}/> Import CSV illimité</li>
              <li><Check size={14}/> Score patrimoine</li>
              <li><Check size={14}/> Suivi mensuel</li>
            </ul>
          </div>

          {/* PRO — featured */}
          <div className="lp-price-card lp-price-card-featured">
            <div className="lp-price-badge">Le plus choisi</div>
            <div className="lp-price-name">Pro</div>
            <div className="lp-price-tagline">Pour aller au bout du suivi</div>
            <div className="lp-price-amount">
              <span className="lp-price-num">{billing === 'monthly' ? '7,99' : '6,49'}</span>
              <span className="lp-price-currency">€</span>
              <span className="lp-price-period">/ {billing === 'monthly' ? 'mois' : 'mois, facturé annuellement'}</span>
            </div>
            <button onClick={onSignUp} className="lp-price-cta lp-price-cta-primary">
              Essayer 14 jours gratuits <ArrowRight size={14}/>
            </button>
            <ul className="lp-price-features">
              <li><Check size={14}/> <strong>Tout du plan Solo</strong></li>
              <li><Check size={14}/> Comptes &amp; placements illimités</li>
              <li><Check size={14}/> Synchro bancaire DSP2 automatique</li>
              <li><Check size={14}/> Simulateur d'impôts FR</li>
              <li><Check size={14}/> Catégorisation IA</li>
              <li><Check size={14}/> Bilan PDF mensuel</li>
              <li><Check size={14}/> Support email prioritaire</li>
            </ul>
          </div>

          {/* FAMILY */}
          <div className="lp-price-card">
            <div className="lp-price-name">Famille</div>
            <div className="lp-price-tagline">Patrimoine partagé à plusieurs</div>
            <div className="lp-price-amount">
              <span className="lp-price-num">{billing === 'monthly' ? '14,99' : '11,99'}</span>
              <span className="lp-price-currency">€</span>
              <span className="lp-price-period">/ {billing === 'monthly' ? 'mois' : 'mois, facturé annuellement'}</span>
            </div>
            <button onClick={onSignUp} className="lp-price-cta lp-price-cta-ghost">Choisir Famille</button>
            <ul className="lp-price-features">
              <li><Check size={14}/> <strong>Tout du plan Pro</strong></li>
              <li><Check size={14}/> Jusqu'à 6 membres du foyer</li>
              <li><Check size={14}/> Quote-parts personnalisables</li>
              <li><Check size={14}/> Permissions par membre</li>
              <li><Check size={14}/> Mode invité (comptable, notaire)</li>
              <li><Check size={14}/> Conseil patrimonial trimestriel</li>
            </ul>
          </div>

        </div>

        <div className="lp-pricing-foot">
          Tous les plans sans engagement, résiliables à tout moment.
          <a href="#faq">Voir les questions fréquentes →</a>
        </div>
      </section>

      {/* === FAQ === */}
      <section id="faq" className="lp-section">
        <div className="lp-section-head">
          <div className="lp-section-eyebrow">Questions fréquentes</div>
          <h2 className="lp-h2">Ce qu'on nous demande le plus.</h2>
        </div>
        <div className="lp-faq">
          <details>
            <summary>Wealthly est-il gratuit&nbsp;? <ChevronDown size={16}/></summary>
            <p>Oui, le plan Solo est entièrement gratuit, à vie. Vous pouvez l'utiliser sans carte de crédit pour gérer jusqu'à 3 comptes bancaires. Les plans Pro et Famille débloquent les comptes illimités, la synchro automatique et les fonctions avancées.</p>
          </details>
          <details>
            <summary>Comment Wealthly protège-t-il mes données bancaires&nbsp;? <ChevronDown size={16}/></summary>
            <p>Wealthly n'a <strong>jamais</strong> vos identifiants bancaires. La connexion DSP2 passe par GoCardless Bank Account Data, prestataire agréé par l'ACPR, en lecture seule. La base est hébergée chez Supabase en Union européenne, chiffrée at-rest. Aucune donnée n'est partagée avec des tiers.</p>
          </details>
          <details>
            <summary>Puis-je auto-héberger Wealthly&nbsp;? <ChevronDown size={16}/></summary>
            <p>Oui. Le code source est entièrement disponible sur GitHub sous licence permissive. Vous pouvez déployer Wealthly sur votre propre infrastructure (VPS, Raspberry Pi, etc.). La documentation détaille les étapes pour Vercel + Railway + Supabase, ou pour Docker self-hosted.</p>
          </details>
          <details>
            <summary>Mes données sont-elles vendues&nbsp;? <ChevronDown size={16}/></summary>
            <p>Jamais. Wealthly ne revend, ne loue, ne partage aucune donnée. Pas de Google Analytics, pas de Meta Pixel, pas de tracker publicitaire. Notre seul revenu vient des abonnements payants.</p>
          </details>
          <details>
            <summary>Qui peut voir le patrimoine de mon foyer&nbsp;? <ChevronDown size={16}/></summary>
            <p>Vous seul, et les membres que vous invitez explicitement. Chaque membre dispose de son propre compte, et vous décidez ce qu'il peut consulter ou modifier. Aucune donnée n'est jamais visible par d'autres utilisateurs ou par Wealthly.</p>
          </details>
          <details>
            <summary>Quelles banques sont supportées&nbsp;? <ChevronDown size={16}/></summary>
            <p>Plus de 1 900 banques européennes via la norme DSP2 et GoCardless. Toutes les banques françaises majeures (BNP Paribas, Société Générale, Crédit Agricole, Boursorama, Revolut, etc.) sont supportées. Pour les comptes hors UE, vous pouvez importer un relevé CSV.</p>
          </details>
        </div>
      </section>

      {/* === FINAL CTA === */}
      <section className="lp-cta-section">
        <div className="lp-cta-card">
          <h2>Prenez la main sur votre patrimoine.</h2>
          <p>Inscription en 30 secondes, sans carte de crédit. Plan Solo gratuit à vie.</p>
          <div className="lp-cta-row">
            <button onClick={onSignUp} className="lp-cta-primary">
              Démarrer maintenant <ArrowRight size={16}/>
            </button>
            <button onClick={onTryDemo} className="lp-cta-ghost">
              <Sparkles size={14}/> Voir la démo
            </button>
          </div>
        </div>
      </section>

      {/* === FOOTER === */}
      <footer className="lp-foot">
        <div className="lp-foot-inner">
          <div className="lp-foot-brand">
            <div className="lp-brand">
              <Tmark size={18}/>
              <span className="lp-brand-name">Wealthly</span>
            </div>
            <p>Le patrimoine de votre famille, enfin clair.</p>
          </div>
          <div className="lp-foot-cols">
            <div className="lp-foot-col">
              <h5>Produit</h5>
              <a href="#features">Fonctionnalités</a>
              <a href="#pricing">Tarifs</a>
              <a href="#security">Sécurité</a>
              <a href="#faq">FAQ</a>
            </div>
            <div className="lp-foot-col">
              <h5>Entreprise</h5>
              <button type="button" onClick={() => setLegal('cgu')}>Mentions légales</button>
              <button type="button" onClick={() => setLegal('privacy')}>Confidentialité</button>
              <a href="mailto:contact@trove.app">Contact</a>
            </div>
            <div className="lp-foot-col">
              <h5>Communauté</h5>
              <a href="https://github.com/Raphyy31/wealthly" target="_blank" rel="noopener noreferrer">
                <Github size={13}/> GitHub
              </a>
              <a href="mailto:contact@trove.app">
                <Mail size={13}/> Email
              </a>
            </div>
          </div>
        </div>
        <div className="lp-foot-bottom">
          <span>© 2026 Wealthly — Tous droits réservés.</span>
          <span className="lp-foot-disclaim">Wealthly ne fournit aucun conseil en investissement. Les outils proposés sont à but informatif.</span>
        </div>
      </footer>

      {legal && <LegalModal kind={legal} onClose={() => setLegal(null)}/>}

      <style>{landingStyles}</style>
    </div>
  );
}

const landingStyles = `
.lp {
  background: #151926;
  color: #f5f5f7;
  font-family: 'Inter Tight', -apple-system, BlinkMacSystemFont, system-ui, sans-serif;
  min-height: 100vh;
  -webkit-font-smoothing: antialiased;
  letter-spacing: -0.01em;
  overflow-x: hidden;
}
.lp * { box-sizing: border-box; }
.lp a { color: inherit; text-decoration: none; }
.lp button { font-family: inherit; cursor: pointer; }

/* === NAV === */
.lp-nav {
  position: sticky; top: 0; z-index: 50;
  background: rgba(21, 25, 38, 0.7);
  backdrop-filter: blur(24px) saturate(140%);
  -webkit-backdrop-filter: blur(24px) saturate(140%);
  border-bottom: 1px solid rgba(255,255,255,0.07);
}
.lp-nav-inner {
  max-width: 1200px; margin: 0 auto;
  padding: 14px 24px;
  display: flex; align-items: center; justify-content: space-between;
  gap: 24px;
}
.lp-brand { display: inline-flex; align-items: center; gap: 10px; }
.lp-brand-name { font-size: 18px; font-weight: 700; letter-spacing: -0.025em; color: #f5f5f7; }
.lp-nav-links { display: flex; gap: 28px; flex: 1; justify-content: center; }
.lp-nav-links a {
  font-size: 13.5px; font-weight: 500; color: #9ea3b3;
  transition: color .15s;
}
.lp-nav-links a:hover { color: #f5f5f7; }
.lp-nav-actions { display: flex; gap: 8px; align-items: center; }
.lp-nav-login {
  background: transparent; border: 0;
  font-size: 13.5px; font-weight: 500; color: #9ea3b3;
  padding: 8px 14px;
}
.lp-nav-login:hover { color: #f5f5f7; }
.lp-nav-cta {
  background: linear-gradient(135deg, #5285ee, #3b6fe0);
  color: white; border: 0;
  padding: 9px 18px; border-radius: 9px;
  font-size: 13.5px; font-weight: 600;
  box-shadow: 0 4px 14px rgba(59,111,224,0.30), inset 0 1px 0 rgba(255,255,255,0.15);
  transition: box-shadow .15s, transform .15s;
}
.lp-nav-cta:hover { box-shadow: 0 6px 20px rgba(59,111,224,0.40), inset 0 1px 0 rgba(255,255,255,0.18); transform: translateY(-1px); }

@media (max-width: 768px) {
  .lp-nav-links { display: none; }
}

/* === HERO === */
.lp-hero {
  position: relative;
  max-width: 1200px; margin: 0 auto;
  padding: 80px 24px 40px;
  text-align: center;
}
.lp-hero-mesh {
  position: absolute; inset: 0; pointer-events: none;
  background:
    radial-gradient(ellipse 60% 50% at 50% 0%, rgba(91,141,239,0.20), transparent 60%),
    radial-gradient(ellipse 50% 40% at 20% 30%, rgba(167,139,250,0.12), transparent 60%),
    radial-gradient(ellipse 40% 30% at 80% 40%, rgba(52,211,153,0.08), transparent 60%);
  z-index: 0;
}
.lp-hero > * { position: relative; z-index: 1; }
.lp-eyebrow-pill {
  display: inline-flex; align-items: center; gap: 8px;
  font-size: 12px; font-weight: 600;
  color: #c8c8d0;
  padding: 7px 14px;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 999px;
  background: rgba(255,255,255,0.04);
  backdrop-filter: blur(8px);
  margin-bottom: 28px;
}
.lp-eyebrow-dot {
  width: 6px; height: 6px; border-radius: 50%;
  background: #34d399;
  box-shadow: 0 0 0 3px rgba(52,211,153,0.25);
}
.lp-h1 {
  font-size: clamp(40px, 6.5vw, 76px);
  font-weight: 800;
  letter-spacing: -0.035em;
  line-height: 1.04;
  margin: 0;
}
.lp-h1-grad {
  background: linear-gradient(135deg, #5285ee 0%, #7aa3ff 50%, #a78bfa 100%);
  -webkit-background-clip: text;
  background-clip: text;
  -webkit-text-fill-color: transparent;
}
.lp-sub {
  font-size: clamp(15px, 1.5vw, 18px);
  line-height: 1.6;
  color: #9ea3b3;
  max-width: 640px;
  margin: 22px auto 32px;
}
.lp-cta-row {
  display: inline-flex; gap: 10px; flex-wrap: wrap; justify-content: center;
}
.lp-cta-primary {
  display: inline-flex; align-items: center; gap: 8px;
  background: linear-gradient(135deg, #5285ee, #3b6fe0);
  color: white; border: 0;
  padding: 13px 22px; border-radius: 11px;
  font-size: 14.5px; font-weight: 600;
  box-shadow: 0 8px 24px rgba(59,111,224,0.40), inset 0 1px 0 rgba(255,255,255,0.18);
  transition: transform .15s, box-shadow .15s;
}
.lp-cta-primary:hover { transform: translateY(-1px); box-shadow: 0 12px 32px rgba(59,111,224,0.50), inset 0 1px 0 rgba(255,255,255,0.20); }
.lp-cta-ghost {
  display: inline-flex; align-items: center; gap: 7px;
  background: rgba(255,255,255,0.04);
  color: #f5f5f7;
  border: 1px solid rgba(255,255,255,0.10);
  padding: 12px 20px; border-radius: 11px;
  font-size: 14px; font-weight: 500;
  transition: background .15s, border-color .15s;
}
.lp-cta-ghost:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }

.lp-trust {
  display: flex; justify-content: center; align-items: center;
  gap: 28px; flex-wrap: wrap;
  margin-top: 52px;
}
.lp-trust-item { display: flex; flex-direction: column; gap: 6px; min-width: 130px; }
.lp-trust-item strong {
  font-size: 24px; font-weight: 700; color: #f5f5f7;
  letter-spacing: -0.025em;
}
.lp-trust-item sup { font-size: 14px; }
.lp-trust-item span { font-size: 11.5px; color: #9ea3b3; line-height: 1.4; }
.lp-trust-sep {
  width: 1px; height: 32px;
  background: rgba(255,255,255,0.10);
}
@media (max-width: 640px) {
  .lp-trust-sep { display: none; }
  .lp-trust { gap: 20px; }
}

.lp-hero-shot {
  margin-top: 60px;
  perspective: 1200px;
}
.lp-shot-frame {
  position: relative;
  border: 1px solid rgba(255,255,255,0.10);
  border-radius: 16px;
  overflow: hidden;
  box-shadow:
    0 24px 80px -20px rgba(0,0,0,0.6),
    0 0 0 1px rgba(91,141,239,0.10);
  background: #1a1f2e;
}
.lp-shot-frame::before {
  content: '';
  position: absolute; inset: 0;
  background: linear-gradient(180deg, rgba(91,141,239,0.05), transparent 30%);
  pointer-events: none;
  z-index: 1;
}
.lp-shot-frame img {
  display: block;
  width: 100%;
  height: auto;
  border-radius: 15px;
}

/* === SECTIONS === */
.lp-section {
  max-width: 1200px; margin: 0 auto;
  padding: 100px 24px;
  position: relative;
}
.lp-section-alt {
  background: rgba(31, 36, 52, 0.4);
  max-width: none;
  border-top: 1px solid rgba(255,255,255,0.05);
  border-bottom: 1px solid rgba(255,255,255,0.05);
}
.lp-section-alt > * {
  max-width: 1200px; margin-left: auto; margin-right: auto;
}
.lp-section-head { text-align: center; margin-bottom: 56px; }
.lp-section-eyebrow {
  display: inline-block;
  font-size: 11.5px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: #7aa3ff;
  margin-bottom: 14px;
}
.lp-h2 {
  font-size: clamp(30px, 4vw, 44px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0;
  color: #f5f5f7;
}
.lp-section-sub {
  font-size: 16px; line-height: 1.6;
  color: #9ea3b3;
  max-width: 580px;
  margin: 14px auto 0;
}

/* === STEPS === */
.lp-steps {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.lp-step {
  background: #1f2434;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 28px;
  transition: border-color .15s, transform .15s;
}
.lp-step:hover { border-color: rgba(91,141,239,0.30); transform: translateY(-2px); }
.lp-step-num {
  width: 36px; height: 36px;
  display: grid; place-items: center;
  background: linear-gradient(135deg, #5285ee, #3b6fe0);
  border-radius: 10px;
  color: white; font-weight: 800; font-size: 16px;
  margin-bottom: 18px;
  box-shadow: 0 4px 14px rgba(59,111,224,0.30);
}
.lp-step h3 {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  margin: 0 0 8px;
}
.lp-step p { font-size: 14px; color: #9ea3b3; line-height: 1.6; margin: 0; }

@media (max-width: 768px) {
  .lp-steps { grid-template-columns: 1fr; }
}

/* === BENTO === */
.lp-bento {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}
.lp-bento-card {
  background: #1f2434;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 28px;
  display: flex; flex-direction: column;
  overflow: hidden;
  transition: border-color .15s, transform .15s;
}
.lp-bento-card:hover { border-color: rgba(91,141,239,0.30); transform: translateY(-2px); }
.lp-bento-large { grid-column: span 2; }
.lp-bento-icon {
  width: 40px; height: 40px;
  display: grid; place-items: center;
  border-radius: 10px;
  margin-bottom: 16px;
}
.lp-bento-card h3 {
  font-size: 18px; font-weight: 700; letter-spacing: -0.02em;
  margin: 0 0 8px;
}
.lp-bento-card p { font-size: 13.5px; color: #9ea3b3; line-height: 1.55; margin: 0 0 18px; }
.lp-bento-card img {
  margin-top: auto;
  width: 100%;
  border-radius: 10px;
  border: 1px solid rgba(255,255,255,0.08);
  display: block;
}

@media (max-width: 900px) {
  .lp-bento { grid-template-columns: repeat(2, 1fr); }
  .lp-bento-large { grid-column: span 2; }
}
@media (max-width: 600px) {
  .lp-bento { grid-template-columns: 1fr; }
  .lp-bento-large { grid-column: span 1; }
}

/* === SECURITY === */
.lp-security-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 16px;
  max-width: 920px;
  margin: 0 auto;
}
.lp-security-item {
  display: flex; gap: 16px; align-items: flex-start;
  padding: 22px;
  background: #1f2434;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 14px;
}
.lp-security-item > svg {
  width: 36px; height: 36px;
  padding: 9px;
  background: rgba(91,141,239,0.16);
  color: #7aa3ff;
  border-radius: 10px;
  flex-shrink: 0;
}
.lp-security-item h4 { font-size: 14.5px; font-weight: 700; margin: 0 0 4px; }
.lp-security-item p { font-size: 13px; color: #9ea3b3; line-height: 1.55; margin: 0; }

@media (max-width: 700px) {
  .lp-security-grid { grid-template-columns: 1fr; }
}

/* === PRICING === */
.lp-billing-toggle {
  display: inline-flex;
  background: rgba(0,0,0,0.30);
  border: 1px solid rgba(255,255,255,0.10);
  padding: 4px;
  border-radius: 12px;
  margin-top: 24px;
}
.lp-billing-toggle button {
  background: transparent; border: 0;
  color: #9ea3b3;
  padding: 8px 18px;
  border-radius: 8px;
  font-size: 13px; font-weight: 600;
  display: inline-flex; align-items: center; gap: 8px;
  transition: background .15s, color .15s;
}
.lp-billing-toggle button.active {
  background: #1f2434;
  color: #f5f5f7;
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.06);
}
.lp-badge-save {
  font-size: 10px; font-weight: 700;
  padding: 2px 7px;
  background: rgba(52,211,153,0.16);
  color: #34d399;
  border-radius: 999px;
}

.lp-pricing-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
  max-width: 1080px;
  margin: 0 auto;
}
.lp-price-card {
  position: relative;
  background: #1f2434;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 16px;
  padding: 32px 28px;
  display: flex; flex-direction: column;
}
.lp-price-card-featured {
  background: linear-gradient(180deg, rgba(91,141,239,0.10), rgba(31,36,52,1));
  border-color: rgba(91,141,239,0.40);
  box-shadow: 0 20px 60px -20px rgba(59,111,224,0.40);
  transform: scale(1.02);
}
.lp-price-badge {
  position: absolute; top: -12px; left: 50%;
  transform: translateX(-50%);
  background: linear-gradient(135deg, #5285ee, #3b6fe0);
  color: white;
  padding: 5px 14px;
  border-radius: 999px;
  font-size: 11px; font-weight: 700;
  letter-spacing: 0.04em;
  box-shadow: 0 4px 14px rgba(59,111,224,0.40);
}
.lp-price-name {
  font-size: 14px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: #7aa3ff;
  margin-bottom: 6px;
}
.lp-price-tagline {
  font-size: 13.5px; color: #9ea3b3;
  margin-bottom: 24px;
}
.lp-price-amount {
  display: flex; align-items: baseline; gap: 4px;
  margin-bottom: 20px;
  font-variant-numeric: tabular-nums;
}
.lp-price-num {
  font-size: 52px; font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
  color: #f5f5f7;
}
.lp-price-currency { font-size: 24px; font-weight: 600; color: #f5f5f7; }
.lp-price-period { font-size: 13px; color: #9ea3b3; margin-left: 8px; }
.lp-price-cta {
  display: inline-flex; align-items: center; justify-content: center; gap: 7px;
  width: 100%;
  padding: 12px 18px;
  border-radius: 11px;
  font-size: 14px; font-weight: 600;
  border: 0; cursor: pointer;
  transition: transform .15s, box-shadow .15s, background .15s;
  margin-bottom: 26px;
}
.lp-price-cta-primary {
  background: linear-gradient(135deg, #5285ee, #3b6fe0);
  color: white;
  box-shadow: 0 4px 14px rgba(59,111,224,0.30), inset 0 1px 0 rgba(255,255,255,0.15);
}
.lp-price-cta-primary:hover { transform: translateY(-1px); box-shadow: 0 8px 24px rgba(59,111,224,0.40), inset 0 1px 0 rgba(255,255,255,0.18); }
.lp-price-cta-ghost {
  background: rgba(255,255,255,0.04);
  color: #f5f5f7;
  border: 1px solid rgba(255,255,255,0.10);
}
.lp-price-cta-ghost:hover { background: rgba(255,255,255,0.07); border-color: rgba(255,255,255,0.18); }

.lp-price-features { list-style: none; padding: 0; margin: 0; }
.lp-price-features li {
  display: flex; align-items: flex-start; gap: 10px;
  padding: 8px 0;
  font-size: 13.5px; color: #c8c8d0;
  line-height: 1.5;
}
.lp-price-features li svg { color: #34d399; flex-shrink: 0; margin-top: 3px; }
.lp-price-features li strong { color: #f5f5f7; font-weight: 600; }

.lp-pricing-foot {
  text-align: center;
  margin-top: 40px;
  font-size: 13px; color: #9ea3b3;
}
.lp-pricing-foot a { color: #7aa3ff; margin-left: 8px; }
.lp-pricing-foot a:hover { text-decoration: underline; }

@media (max-width: 900px) {
  .lp-pricing-grid { grid-template-columns: 1fr; max-width: 480px; }
  .lp-price-card-featured { transform: none; }
}

/* === FAQ === */
.lp-faq {
  max-width: 760px; margin: 0 auto;
  display: flex; flex-direction: column; gap: 8px;
}
.lp-faq details {
  background: #1f2434;
  border: 1px solid rgba(255,255,255,0.08);
  border-radius: 12px;
  padding: 0;
  overflow: hidden;
}
.lp-faq summary {
  display: flex; align-items: center; justify-content: space-between;
  padding: 18px 22px;
  font-size: 14.5px; font-weight: 600;
  cursor: pointer;
  list-style: none;
  color: #f5f5f7;
}
.lp-faq summary::-webkit-details-marker { display: none; }
.lp-faq summary svg { color: #9ea3b3; transition: transform .2s; flex-shrink: 0; margin-left: 12px; }
.lp-faq details[open] summary svg { transform: rotate(180deg); }
.lp-faq details p {
  padding: 0 22px 20px;
  margin: 0;
  font-size: 13.5px;
  color: #9ea3b3;
  line-height: 1.65;
}
.lp-faq details p strong { color: #f5f5f7; font-weight: 600; }

/* === FINAL CTA === */
.lp-cta-section {
  max-width: 1200px; margin: 0 auto;
  padding: 60px 24px 100px;
}
.lp-cta-card {
  text-align: center;
  background: linear-gradient(135deg, rgba(91,141,239,0.16), rgba(167,139,250,0.10));
  border: 1px solid rgba(91,141,239,0.30);
  border-radius: 24px;
  padding: 56px 40px;
  position: relative; overflow: hidden;
}
.lp-cta-card::before {
  content: '';
  position: absolute; top: -100px; right: -100px;
  width: 380px; height: 380px;
  background: radial-gradient(circle, rgba(91,141,239,0.30), transparent 70%);
  pointer-events: none;
}
.lp-cta-card > * { position: relative; }
.lp-cta-card h2 {
  font-size: clamp(28px, 3.5vw, 40px);
  font-weight: 700; letter-spacing: -0.03em;
  line-height: 1.1;
  margin: 0 0 14px;
}
.lp-cta-card p {
  font-size: 16px; color: #c8c8d0;
  margin: 0 0 28px;
}

/* === FOOTER === */
.lp-foot {
  border-top: 1px solid rgba(255,255,255,0.07);
  background: #131722;
}
.lp-foot-inner {
  max-width: 1200px; margin: 0 auto;
  padding: 60px 24px 30px;
  display: grid;
  grid-template-columns: 1.5fr 2fr;
  gap: 48px;
}
.lp-foot-brand p {
  font-size: 13.5px; color: #9ea3b3;
  margin: 16px 0 0;
  line-height: 1.5;
  max-width: 280px;
}
.lp-foot-cols {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 32px;
}
.lp-foot-col h5 {
  font-size: 12px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.08em;
  color: #f5f5f7;
  margin: 0 0 14px;
}
.lp-foot-col a, .lp-foot-col button {
  display: flex; align-items: center; gap: 7px;
  background: transparent; border: 0; padding: 0;
  font: inherit; text-align: left;
  font-size: 13.5px; color: #9ea3b3;
  margin-bottom: 10px;
  text-decoration: none;
  cursor: pointer;
  transition: color .15s;
}
.lp-foot-col a:hover, .lp-foot-col button:hover { color: #f5f5f7; }
.lp-foot-bottom {
  max-width: 1200px; margin: 0 auto;
  padding: 18px 24px 30px;
  border-top: 1px solid rgba(255,255,255,0.06);
  display: flex; justify-content: space-between; gap: 16px; flex-wrap: wrap;
  font-size: 12px; color: #6a6f80;
}
.lp-foot-disclaim { max-width: 580px; line-height: 1.5; }

@media (max-width: 768px) {
  .lp-foot-inner { grid-template-columns: 1fr; gap: 32px; }
  .lp-foot-cols { grid-template-columns: repeat(2, 1fr); gap: 24px; }
}
@media (max-width: 480px) {
  .lp-foot-cols { grid-template-columns: 1fr; }
}

/* === Hide mobile-specific anchors politely on scroll === */
@media (max-width: 768px) {
  .lp-section { padding: 64px 20px; }
  .lp-cta-section { padding: 40px 20px 64px; }
  .lp-cta-card { padding: 40px 24px; }
}
`;
