# Wealthly — Roadmap & idées d'amélioration

---

## ✅ Déjà fait (session actuelle)

- [x] Setup sans Docker : Python + SQLite + Node.js en local
- [x] Auth JWT (register / login / me)
- [x] Import CSV multi-banques (Revolut, Crédit Agricole, Boursorama, LCL…)
- [x] Catégorisation hybride : 25 règles regex intégrées → règles custom → **Claude Haiku (IA)**
- [x] Navigation repensée : Résumé · Trésorerie · Budgets · Patrimoine · Transactions · Réglages
- [x] Dashboard Résumé : 4 cartes hero (Patrimoine net · Perf 1m · Liquidité · Endettement)
- [x] Trésorerie : taux d'épargne · analyse approfondie (top marchands, évolution catégories)
- [x] Patrimoine : allocation par classe d'actifs (donut) · KPIs gestion privée

---

## 🔜 Prochaines étapes prioritaires

### P0 — Finitions immédiates

- [ ] **Responsive mobile** : les grilles KPI s'empilent correctement sur petits écrans
- [ ] **PWA manifest** : ajouter `manifest.json` + icônes pour installer l'app sur l'écran d'accueil iOS/Android sans App Store
- [ ] **Alerte budget dépassé** : badge rouge clignotant dans la nav quand un budget est dépassé ce mois
- [ ] **Règles d'auto-catégorisation custom** : interface dans Réglages pour créer/tester ses propres regex avant de passer à l'IA

### P1 — Fonctionnalités manquantes vs la concurrence

- [ ] **Invitation conjoint** : envoyer un lien pour qu'un second utilisateur rejoigne le même foyer (partage de token d'invitation, rôles owner/member)
- [ ] **Rapport PDF mensuel** : export automatique d'un bilan mensuel propre (style relevé banque privée) — librairie `reportlab` côté backend
- [ ] **Migrations Alembic** : remplacer `Base.metadata.create_all` par de vraies migrations versionnées pour évoluer le schéma sans perdre les données
- [ ] **Calcul plus-values latentes** : pour les actifs de type PEA/CTO, saisir le prix de revient et afficher la plus-value en % et en €

### P2 — UX & design

- [ ] **Onboarding guidé** : wizard 3 étapes à la première connexion (ajouter compte → importer CSV → définir budgets) avec barre de progression
- [ ] **Tooltip contextuel** sur les KPIs gestion privée (ex: clic sur "Ratio d'endettement" → explication de ce que c'est et comment l'interpréter)
- [ ] **Graphique patrimoine net historique** dans le Résumé : courbe chronologique du net worth (nécessite de stocker des snapshots)
- [ ] **Aperçu de compte** : cliquer sur un compte dans la liste pour voir ses transactions directement
- [ ] **Tri et filtres avancés** dans Transactions : multi-catégories, plage de dates, montant min/max

---

## 💡 Idées inspirées de la concurrence

*(Finary, Bankin, YNAB, Personal Capital, Copilot, Linxea)*

### Synchro bancaire automatique

Le plus demandé sur tous les outils. Plutôt que d'importer des CSV manuellement :

- **Bridge by Bankin** (API française DSP2, ~30 banques FR) — gratuit jusqu'à ~50 req/mois
- **GoCardless Bank Account Data** (ex-Nordigen) — gratuit jusqu'à 50 connexions, 90 jours d'historique
- **Powens** (ex-Budget Insight) — plus complet, payant

Implémentation : nouveau router `/sync`, OAuth flow dans le frontend, webhook ou polling pour récupérer les nouvelles transactions.

### Projection retraite *(style JP Morgan / Goldman Sachs)*

Calculateur basé sur :
- Revenus actuels + taux d'épargne
- Actifs existants (PEA, PER, AV)
- Âge cible de départ
- Hypothèses de rendement paramétrable (3%, 5%, 7%)

Affiche : capital estimé à la retraite, rente mensuelle équivalente, gap vs objectif.

### Simulateur de crédit immobilier

Saisir : prix du bien, apport, durée, taux → simulation mensualité, coût total du crédit, capacité d'emprunt basée sur les revenus de Trésorerie. Comparaison achat vs location sur 10/20 ans.

### Alertes & notifications

- Budget dépassé à 80% → notification push (via service worker si PWA)
- Dépense inhabituelle > 2× la moyenne détectée
- Facture récurrente manquante ce mois
- Évolution du patrimoine net (chaque 1er du mois)

### Enrichissement des transactions *(style Copilot)*

- Logo du marchand (API Clearbit ou Brandfetch, gratuit)
- Normalisation du libellé (ex: "VIR PERM NETFLIX INTL" → "Netflix")
- Mémorisation des corrections manuelles pour les futures transactions

### Score de santé financière *(style Finary)*

Note de 0 à 100 calculée sur :
- Taux d'épargne (objectif : ≥20%)
- Ratio d'endettement (objectif : <30%)
- Fonds d'urgence (objectif : 3-6 mois de charges)
- Diversification des actifs (objectif : pas + de 70% sur une classe)
- Régularité d'épargne (objectif : mois positifs consécutifs)

### Rebalancing d'allocation *(style gestion privée)*

L'utilisateur définit une allocation cible (ex: 40% immo, 30% placements, 20% épargne, 10% liquidités).  
Le dashboard affiche l'écart actuel vs cible et suggère les mouvements à effectuer.

### Optimisation fiscale *(France-centric)*

Suggestions contextuelles :
- "Votre PEA a X€ de plus-value latente — pensez à ne pas le clôturer avant 5 ans"
- "Vous avez versé X€ sur votre AV cette année — plafond déductible : Y€"
- "Votre TMI estimé est X% — le PER vous ferait économiser Z€/an"

### Mode hors-ligne / PWA

Service worker qui cache les données localement pour une consultation sans internet. Synchronisation différée quand la connexion revient.

---

## 🏗️ Architecture future (si l'app grandit)

- **Alembic** pour les migrations DB (prioritaire avant d'ajouter des colonnes)
- **Celery + Redis** pour les tâches async (synchro bancaire, envoi de rapports PDF par email)
- **Tests** : pytest pour les routers backend (au moins auth + transactions), Playwright pour les flux critiques frontend
- **Docker Compose optionnel** : ré-activer Docker pour ceux qui veulent un déploiement one-command (SQLite → volume monté)
- **Multi-foyers** : un utilisateur peut appartenir à plusieurs foyers (utile pour gérer le patrimoine des parents)

---

## 📝 Notes pour reprendre le travail avec Claude

**Stack** :
- Backend : FastAPI, SQLAlchemy, SQLite (`backend/wealthly.db`), Python 3.13
- Frontend : React 18, Vite, Recharts, Lucide-react — tout dans `frontend/src/WealthlyApp.jsx` (~4000 lignes)
- Auth : JWT via `python-jose`, stocké dans `localStorage` (`wealthly:token`)
- IA : Claude Haiku (`claude-haiku-4-5-20251001`) via `backend/app/routers/categorize.py`

**Lancer l'app** :
```bash
# Terminal 1
cd backend && uvicorn app.main:app --reload --port 8000
# Terminal 2
cd frontend && npm run dev
# → http://localhost:3000
```

**Fichiers clés** :
- `frontend/src/WealthlyApp.jsx` — toute l'UI (composants : Dashboard, Monthly/Trésorerie, Budgets, Wealth, Transactions, Analysis, SettingsView)
- `frontend/src/api.js` — tous les appels HTTP vers le backend
- `backend/app/routers/` — un fichier par domaine métier
- `backend/app/models.py` — schéma de la DB
- `backend/app/routers/categorize.py` — logique de catégorisation 3 passes
- `backend/.env` — config locale (jamais committer)

**Conventions CSS** : variables CSS dans `:root`, thème dark/light via `data-theme` sur `<html>`. Classes BEM light : `.kpi-card`, `.mk-card`, `.ws-card`, `.wk-card`.

**Pour continuer avec Claude Code** :  
Ouvrir le dossier `wealthly/` dans VS Code ou un terminal, lancer `claude` (CLI), et décrire ce que tu veux ajouter. Le contexte de cette session est disponible dans `.claude/projects/`.
