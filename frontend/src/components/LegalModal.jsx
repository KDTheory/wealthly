import React from 'react';
import { X } from 'lucide-react';

export function LegalModal({ section = 'cgu', onClose }) {
  return (
    <div className="legal-overlay" onClick={onClose}>
      <div className="legal-modal" onClick={e => e.stopPropagation()}>
        <button className="legal-close" onClick={onClose} aria-label="Fermer"><X size={16}/></button>

        <div className="legal-tabs">
          <a href="#cgu" className={section === 'cgu' ? 'active' : ''}>CGU</a>
          <a href="#privacy" className={section === 'privacy' ? 'active' : ''}>Confidentialité</a>
        </div>

        {section === 'cgu' && (
          <div className="legal-body">
            <h2>Conditions Générales d'Utilisation</h2>
            <p className="legal-date">En vigueur au 7 mai 2026</p>

            <h3>1. Objet</h3>
            <p>Trove est un outil personnel de suivi de patrimoine. Il permet de consolider comptes bancaires, placements, immobilier et dettes au sein d'un foyer. Il ne constitue en aucun cas un conseil en investissement, un service bancaire ou un service de gestion sous mandat.</p>

            <h3>2. Accès au service</h3>
            <p>L'accès nécessite la création d'un compte (email + mot de passe). Le compte ouvre un espace isolé («&nbsp;foyer&nbsp;») inaccessible aux autres utilisateurs. Chaque inscription crée un foyer distinct.</p>

            <h3>3. Usage</h3>
            <p>Le service est réservé à un usage personnel et privé. Il n'est pas autorisé de l'utiliser à des fins commerciales, de revente ou pour traiter des données appartenant à des tiers sans leur consentement.</p>

            <h3>4. Disponibilité</h3>
            <p>Trove est fourni «&nbsp;en l'état&nbsp;». Aucune garantie de disponibilité continue n'est accordée. Des interruptions liées à la maintenance ou à l'hébergement peuvent survenir sans préavis.</p>

            <h3>5. Responsabilité</h3>
            <p>Les données affichées proviennent exclusivement de ce que l'utilisateur saisit ou importe. Trove ne se connecte à aucun établissement financier sans action explicite de l'utilisateur. L'opérateur décline toute responsabilité pour les décisions financières prises sur la base des informations affichées.</p>

            <h3>6. Résiliation</h3>
            <p>L'utilisateur peut demander la suppression définitive de son compte et de l'ensemble de ses données à tout moment en écrivant à <a href="mailto:contact@trove.app">contact@trove.app</a>. La suppression est effective sous 30 jours.</p>

            <h3>7. Modifications</h3>
            <p>Ces CGU peuvent être mises à jour. La date en en-tête fait foi. L'usage continu du service après mise à jour vaut acceptation.</p>
          </div>
        )}

        {section === 'privacy' && (
          <div className="legal-body">
            <h2>Politique de confidentialité</h2>
            <p className="legal-date">En vigueur au 7 mai 2026 — conforme RGPD</p>

            <h3>1. Responsable du traitement</h3>
            <p>Trove est opéré à titre personnel. Contact : <a href="mailto:contact@trove.app">contact@trove.app</a></p>

            <h3>2. Données collectées</h3>
            <p>Trove collecte uniquement les données que vous saisissez ou importez :</p>
            <ul>
              <li>Adresse email et mot de passe (haché bcrypt, jamais stocké en clair)</li>
              <li>Noms des membres du foyer</li>
              <li>Comptes, transactions, actifs, passifs et budgets que vous renseignez</li>
              <li>Éventuellement, données synchronisées depuis votre banque via GoCardless si vous activez cette fonctionnalité</li>
            </ul>
            <p>Aucune donnée de navigation, cookie publicitaire ou tracker tiers n'est collecté.</p>

            <h3>3. Finalité</h3>
            <p>Les données sont utilisées exclusivement pour faire fonctionner le service : afficher votre tableau de bord, calculer vos indicateurs patrimoniaux et générer vos exports PDF. Elles ne sont jamais vendues, partagées avec des tiers ni utilisées à des fins publicitaires.</p>

            <h3>4. Hébergement</h3>
            <ul>
              <li><strong>Frontend</strong> : Vercel (CDN mondial)</li>
              <li><strong>Backend</strong> : Railway (serveurs européens)</li>
              <li><strong>Base de données</strong> : Supabase (région EU West)</li>
            </ul>

            <h3>5. Accès technique de l'opérateur</h3>
            <p>L'opérateur dispose d'un accès technique à la base de données hébergée sur Supabase. <strong>Trove s'engage à ne jamais consulter les données personnelles ou financières des utilisateurs</strong>, sauf obligation légale contraignante (réquisition judiciaire). Cet engagement est une pratique, pas un verrou technique — si vous souhaitez une garantie absolue, le code source est disponible sur GitHub pour déploiement sur votre propre infrastructure.</p>

            <h3>6. Durée de conservation</h3>
            <p>Les données sont conservées tant que le compte est actif. Elles sont supprimées dans les 30 jours suivant une demande de clôture de compte.</p>

            <h3>7. Vos droits (RGPD)</h3>
            <p>Conformément au Règlement Général sur la Protection des Données, vous disposez des droits suivants :</p>
            <ul>
              <li><strong>Accès</strong> : obtenir une copie de vos données</li>
              <li><strong>Rectification</strong> : corriger des données inexactes</li>
              <li><strong>Suppression</strong> : demander l'effacement de votre compte</li>
              <li><strong>Portabilité</strong> : exporter vos données (format JSON disponible)</li>
              <li><strong>Opposition</strong> : s'opposer à un traitement</li>
            </ul>
            <p>Pour exercer ces droits : <a href="mailto:contact@trove.app">contact@trove.app</a>. En cas de litige non résolu, vous pouvez saisir la CNIL (<a href="https://www.cnil.fr" target="_blank" rel="noopener noreferrer">cnil.fr</a>).</p>

            <h3>8. Cookies</h3>
            <p>Trove n'utilise pas de cookies publicitaires. Un token JWT est stocké dans <code>localStorage</code> pour maintenir votre session. Il expire automatiquement après 7 jours.</p>
          </div>
        )}

        <style>{legalStyles}</style>
      </div>
    </div>
  );
}

const legalStyles = `
.legal-overlay {
  position: fixed; inset: 0; z-index: 9999;
  background: rgba(0,0,0,0.7);
  display: flex; align-items: center; justify-content: center;
  padding: 24px 16px;
  backdrop-filter: blur(4px);
}
.legal-modal {
  background: #13151a;
  border: 1px solid #232730;
  border-radius: 12px;
  width: 100%; max-width: 640px;
  max-height: 80vh;
  display: flex; flex-direction: column;
  position: relative;
  box-shadow: 0 24px 60px -20px rgba(0,0,0,0.6);
}
.legal-close {
  position: absolute; top: 14px; right: 14px;
  background: none; border: none; cursor: pointer;
  color: #6e6a64; padding: 4px;
  display: flex; border-radius: 4px;
  transition: color .15s, background .15s;
}
.legal-close:hover { color: #ebe8e3; background: #1e2028; }
.legal-tabs {
  display: flex; gap: 2px; padding: 12px 16px 0;
  border-bottom: 1px solid #232730;
  flex-shrink: 0;
}
.legal-tabs a {
  padding: 8px 14px; border-radius: 6px 6px 0 0;
  font-size: 12px; font-weight: 600;
  color: #6e6a64; text-decoration: none;
  letter-spacing: 0.02em;
  transition: color .15s;
  border-bottom: 2px solid transparent;
  margin-bottom: -1px;
}
.legal-tabs a.active { color: #c5a572; border-bottom-color: #c5a572; }
.legal-tabs a:hover:not(.active) { color: #ebe8e3; }
.legal-body {
  overflow-y: auto; padding: 24px 28px 32px;
  font-size: 13px; line-height: 1.65; color: #b5b2ab;
}
.legal-body h2 {
  font-size: 17px; font-weight: 600; color: #ebe8e3;
  margin: 0 0 4px; letter-spacing: -0.02em;
}
.legal-date { font-size: 11px; color: #6e6a64; margin: 0 0 24px; }
.legal-body h3 {
  font-size: 11px; font-weight: 700;
  text-transform: uppercase; letter-spacing: 0.12em;
  color: #c5a572; margin: 20px 0 8px;
}
.legal-body p { margin: 0 0 10px; }
.legal-body ul { margin: 0 0 10px; padding-left: 18px; }
.legal-body li { margin-bottom: 5px; }
.legal-body a { color: #c5a572; text-decoration: none; }
.legal-body a:hover { text-decoration: underline; }
.legal-body code {
  background: #1e2028; border: 1px solid #2e333f;
  border-radius: 3px; padding: 1px 5px;
  font-size: 12px; color: #ebe8e3;
}
@media (max-width: 600px) {
  .legal-modal { max-height: 90vh; border-radius: 12px; }
  .legal-body { padding: 20px; }
}
`;
