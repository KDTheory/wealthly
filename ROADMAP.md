# Wealthly — Roadmap

État au **2026-05-05**.

---

## ✅ Fait

### Visuel & design system
- [x] Tailwind v4 + design tokens (CSS vars) — palette "encre profonde + or sobre" type banque privée
- [x] Refonte complète du Dashboard (Tailwind utilities, tokens-based)
- [x] Propagation de la palette sur toutes les pages via le CSS-in-JS existant (rewiring des `--bg-card`, `--primary`…)
- [x] Boutons / inputs / cartes adoucis (radii sharper, pas de glow bleu, pas de transform hover)
- [x] Nouveau monogramme W or (favicon + brand mark + AuthScreen + onboarding)
- [x] AuthScreen entièrement refait — layout 2 colonnes, sombre, branded, modes login/register/forgot/reset
- [x] Onboarding : palette membres harmonisée, ready-icon sobre, copy resserrée, progress dots inversés sur or
- [x] Rename "Trésorerie" → "Suivi mensuel"

### Mobile & PWA
- [x] Mobile responsive : nav en barre du bas, header compact, modales plein écran, tableau transactions reflowé
- [x] Safe-area-inset support (iPhone à encoche)
- [x] PWA installable : manifest, icônes (gold W on dark + maskable variant), service worker minimal (network-first shell, cache-first hashed assets)
- [x] Métadonnées iOS (`apple-mobile-web-app-capable`, viewport-fit=cover)

### Features fonctionnelles
- [x] **Export PDF bilan** mensuel (3 pages : Synthèse, Trésorerie, Détail) via jsPDF + jspdf-autotable
- [x] **Simulateur d'impôt FR 2025** :
  - Barème progressif, parts fiscales (couple / enfants), plafond du quotient familial, décote
  - Salaires séparés conjoint A / conjoint B + primes exceptionnelles par conjoint
  - Crédits d'impôt : garde d'enfants <6 ans (3 500 €/enfant) + emploi à domicile CESU (12 000 € + 1 500 €/personne, max 15 000 €)
  - Plafond global niches fiscales 10 000 € (avec warning quand atteint)
  - Pré-remplissage depuis l'historique transactions
  - Solde à payer / trop-perçu vs PAS, taux PAS cible
- [x] **Règles de catégorisation custom** (UI dans Réglages, validation regex client-side, pipe-separated patterns)
- [x] **Historique patrimoine** : nouvelle table `wealth_snapshots`, snapshot mensuel auto-uploadé (debounced + idempotent), courbe d'évolution sur la page Patrimoine
- [x] **Alerte budget** : badge rouge sur la nav avec le nombre de budgets dépassés ce mois
- [x] **Mot de passe oublié** : table `password_reset_tokens` (SHA-256, single-use, 60 min), email via Resend, écran reset auto-déclenché par `?reset_token=` dans l'URL
- [x] **Mode démo** : seed côté client pour explorer l'app sans inscription (Alice + Bob + Léa, 6 mois de données réalistes)

### Backend & infra
- [x] CORS regex pour matcher tous les déploiements Vercel (`wealthly(-…)?\.vercel\.app`)
- [x] Tests pytest (25 tests couvrent auth, password reset, snapshots, rules)
- [x] CI GitHub Actions sur chaque push + PR (notification mail si KO)
- [x] Logging structuré du service email (Railway logs)

### Bugs résolus
- [x] Carte "Charges fixes" qui suivait au scroll (grid-row: span 2 retiré)
- [x] Section "Composition" du Dashboard cassée (référence à `wealthComposition` undefined → utilise `allocationData`)

---

## 🔜 À faire

### Refactoring (prio 1, technique)
- [ ] **Découpe du monolithe** `frontend/src/WealthlyApp.jsx` (~4500 lignes) en :
  - `lib/constants.js`, `lib/format.js`, `lib/recurring.js`
  - `components/AnimatedNumber.jsx`, `Toast.jsx`, `Confetti.jsx`, `Styles.jsx`
  - `views/Dashboard.jsx`, `Wealth.jsx`, `Monthly.jsx`, `Transactions.jsx`, `Budgets.jsx`, `SettingsView.jsx`, `ImportFlow.jsx`, `Onboarding.jsx`
  - `components/MemberEditor.jsx`, `AssetEditor.jsx`, `LiabilityEditor.jsx`
  - `hooks/useReload.js`, `useMembers.js`, etc.
  
  À faire par niveaux pour limiter le risque (utils → composants → vues → modales).

### Sécurité (prio 1)
- [ ] **Vérifier `SECRET_KEY`** sur Railway — toujours penser à la rotation périodique
- [ ] **2FA** (TOTP via `pyotp` + QR code)
- [ ] **Journal de connexion** : table `login_events` avec IP / user-agent / timestamp, vue admin
- [ ] **Rate limiting** sur `/auth/login` et `/auth/forgot-password` (slowapi)

### Features (prio 2)
- [ ] **Tests frontend** — vitest sur `taxFr.js` (le moteur fiscal mérite une couverture rigoureuse vu sa criticité)
- [ ] **Calcul plus-values latentes** sur les actifs (PEA, CTO) — saisir prix de revient, afficher PV en € et %
- [ ] **Plafond annuel** sur PEA (150 000 €) et Livret A — alertes
- [ ] **Comparaison mois N vs N-1** sur le suivi mensuel
- [ ] **Score de santé financière** (style Finary) : note 0-100 sur taux d'épargne, ratio dette, fonds d'urgence, diversification
- [ ] **Migrations Alembic** — actuellement `Base.metadata.create_all()` sur startup, qui rajoute des tables mais ne migre rien d'existant. Avant tout changement de colonne, basculer.

### UX (prio 3)
- [ ] **Tooltips** sur les KPIs gestion privée (explication du concept)
- [ ] **Aperçu de compte** : cliquer sur un compte ouvre ses transactions filtrées
- [ ] **Tri / filtres avancés** dans Transactions : multi-catégories, plage de dates, montant min/max
- [ ] **Onboarding** : preview live des KPIs mis à jour au fur et à mesure que l'utilisateur saisit ses comptes

---

## 🚫 Hors scope (volontairement)

- ❌ **Synchro bancaire automatique** (Bridge / GoCardless / Powens) — l'utilisateur a explicitement refusé
- ❌ **Rebalancing d'allocation** — refusé
- ❌ **Garde alternée** dans le simulateur d'impôt — supprimé sur demande utilisateur

---

## 📅 Notes session 2026-05-05

Direction visuelle stabilisée : **encre profonde + or sobre + sage / terracotta sourds**. Inspirations : Finary (couleur, typo numéraire), Linear (sobriety craft), banque privée (mood général). Le user a explicitement validé après l'avoir vu en prod.

Email "mot de passe oublié" — point d'attention : avec l'expéditeur par défaut `onboarding@resend.dev`, **Resend free tier ne livre qu'à l'email du compte Resend**. Pour envoyer à n'importe qui, **vérifier un domaine** sur resend.com.
