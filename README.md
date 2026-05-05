# Wealthly — Patrimoine privé

Application web de **gestion patrimoniale familiale** auto-hébergée. Comptes bancaires, immobilier, placements, prêts, budgets, suivi mensuel, simulateur d'impôt FR, KPIs gestion privée et historique du patrimoine.

> **Production** : https://wealthly-six.vercel.app

| | |
|---|---|
| Frontend | React 18 + Vite + Recharts + Tailwind v4 — déployé sur **Vercel** |
| Backend | FastAPI + SQLAlchemy — déployé sur **Railway** |
| Database | Postgres hébergé sur **Supabase** |
| Email | **Resend** (mot de passe oublié) |
| AI | Claude Haiku (catégorisation, optionnel, BYOK) |
| Auth | JWT (bcrypt + python-jose), stocké en localStorage |
| PWA | Installable depuis le navigateur sur iOS / Android / desktop |
| Tests | pytest backend + GitHub Actions CI |

---

## Sommaire

1. [Features](#features)
2. [Architecture & topologie](#architecture--topologie)
3. [Lancer en local](#lancer-en-local)
4. [Variables d'environnement](#variables-denvironnement)
5. [Déploiement](#déploiement)
6. [Structure du repo](#structure-du-repo)
7. [Tests](#tests)
8. [Sécurité](#sécurité)
9. [Dépannage](#dépannage)

---

## Features

### Core
- **Auth complète** : inscription, connexion, JWT 7 jours, **mot de passe oublié** (lien email Resend, token single-use, expire 60 min)
- **Multi-membres** : foyer = un compte admin + plusieurs membres (adultes / enfants), comptes joints partagés automatiquement
- **Import CSV** : détection auto de la banque (Revolut, Crédit Agricole, Boursorama, LCL, BNP, etc.), mapping colonnes, prévisualisation
- **Catégorisation hybride** : règles regex intégrées → règles regex personnalisées (UI dans Réglages) → Claude Haiku (BYOK) → "non catégorisé"

### Vues
- **Résumé** (Dashboard) — patrimoine net + 4 KPIs, anomalies, allocation, top dépenses, comptes, activité récente, succès, **export PDF** d'un bilan 3 pages
- **Suivi mensuel** — cashflow du mois, charges fixes auto-détectées, calendrier, comparaison vs moyenne 3 mois
- **Budgets** — répartition 50/30/20, plafonds par catégorie avec barres de progression, **badge rouge sur la nav** quand un budget est dépassé
- **Patrimoine** — actifs / passifs / allocation par classe (donut), KPIs gestion privée, **courbe d'évolution mensuelle** du patrimoine net (snapshots auto)
- **Transactions** — table avec filtres, recatégorisation manuelle, marquage récurrent
- **Impôts** — **simulateur d'impôt FR 2025** (barème, parts fiscales, plafond quotient, décote, crédits garde d'enfants + CESU avec plafond niches fiscales 10 000 €)
- **Réglages** — membres, comptes, succès, règles de catégorisation custom, export/import backup JSON

### Mode démo
Bouton "Voir avec un jeu de démo" sur l'écran de connexion → app pré-remplie (Alice + Bob + Léa, 6 mois de transactions, immo + PEA + AV + prêt). Aucune inscription, aucune écriture en base.

### PWA installable
- Manifest, service worker, icônes
- "Ajouter à l'écran d'accueil" depuis Safari iOS / Chrome Android → app plein écran avec barre de navigation en bas
- Cache offline du shell HTML, network-first pour les mises à jour

---

## Architecture & topologie

```
   Browser
      │ HTTPS
      ▼
   Vercel (Frontend statique React)
      │ /api/* → CORS regex match
      ▼
   Railway (FastAPI Python)
      │ Postgres TLS
      ▼
   Supabase (DB hébergée)

   Resend  ◄── backend (mot de passe oublié)
```

**CORS** : le backend accepte tout `https://wealthly(-…)?\.vercel\.app` via une regex (`CORS_ORIGIN_REGEX`), donc chaque nouveau déploiement Vercel marche automatiquement.

**Auth** : JWT signé avec `SECRET_KEY` (env Railway). Le token est stocké dans `localStorage` côté navigateur sous `wealthly:token`. Pour les snapshots patrimoine, le frontend POST automatiquement le snapshot du mois courant.

---

## Lancer en local

> Pas de Docker requis. SQLite + uvicorn + Vite.

### Prérequis

| Outil | Version | Vérification |
|---|---|---|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| Git | n'importe | `git --version` |

### Backend

```bash
cd backend
cp .env.example .env
# Édite backend/.env :
#   - SECRET_KEY (génère avec: python3 -c "import secrets; print(secrets.token_urlsafe(48))")
#   - DATABASE_URL (laisser SQLite en local : sqlite:///./wealthly.db)
#   - RESEND_API_KEY (optionnel — sinon le mot de passe oublié logge le lien sans envoyer)

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Frontend

```bash
cd frontend
npm install
npm run dev
```

→ http://localhost:3000

---

## Variables d'environnement

### Backend (`backend/.env` ou Railway → Variables)

| Variable | Obligatoire | Défaut | Description |
|---|---|---|---|
| `DATABASE_URL` | oui | `postgresql://wealthly:wealthly@db:5432/wealthly` | URL de connexion. SQLite supporté pour le dev (`sqlite:///./wealthly.db`) |
| `SECRET_KEY` | **oui en prod** | `CHANGE_ME_IN_PRODUCTION_PLEASE` | Clé HMAC pour signer les JWT. **Doit faire ≥32 caractères aléatoires en prod.** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | non | `10080` (7 jours) | Durée de vie du JWT |
| `CORS_ORIGINS` | non | `http://localhost:3000,http://localhost:5173` | Liste exacte d'origines autorisées (CSV) |
| `CORS_ORIGIN_REGEX` | non | `^https://wealthly(-[a-z0-9-]+)?\.vercel\.app$` | Pattern d'origines autorisées — couvre tous les déploiements Vercel |
| `ANTHROPIC_API_KEY` | non | — | Active la catégorisation IA Claude Haiku |
| `RESEND_API_KEY` | non | — | Sans elle, le flow "mot de passe oublié" est silencieux (logs uniquement) |
| `EMAIL_FROM` | non | `Wealthly <onboarding@resend.dev>` | Expéditeur. Avec l'adresse par défaut, **Resend free tier ne livre qu'à l'email du compte Resend**. Vérifier un domaine sur resend.com pour envoyer à n'importe qui. |
| `FRONTEND_URL` | non | `https://wealthly-six.vercel.app` | Base URL utilisée pour construire les liens de reset |

### Frontend (Vercel → Settings → Environment Variables)

| Variable | Description |
|---|---|
| `VITE_API_URL` | URL du backend Railway (ex: `https://wealthly-production-45aa.up.railway.app`). Sans elle, le frontend appelle `/api` qui n'existe pas en prod. |

---

## Déploiement

L'app est **auto-déployée** : tout push sur `main` déclenche

- Vercel → build du frontend → déploiement immédiat (~1 min)
- Railway → redémarrage du backend si les fichiers `backend/` ont changé (~1-2 min)
- GitHub Actions → tests pytest sur chaque push (notification mail si KO)

Pour ajouter ou changer une URL Vercel : Vercel Dashboard → Project → Settings → Domains. Le pattern CORS `wealthly(-…)?\.vercel\.app` couvre déjà tout `wealthly-*.vercel.app`. Pour un domaine custom, ajouter dans `CORS_ORIGINS` ou ajuster le regex.

Pour pivoter d'un fournisseur vers un autre :

```bash
# Frontend → autre hébergeur (Cloudflare Pages, Netlify…) :
cd frontend && npm install && npm run build
# Puis servir frontend/dist/ avec n'importe quel CDN ou nginx.

# Backend → autre PaaS (Fly.io, Render…) :
# Pas de magie : pip install + uvicorn. Penser à reporter les env vars.

# Database → autre Postgres :
# pg_dump sur Supabase, pg_restore ailleurs. Aucun code à changer.
```

---

## Structure du repo

```
wealthly/
├── backend/                    FastAPI + SQLAlchemy
│   ├── app/
│   │   ├── main.py             Point d'entrée + CORS + routers
│   │   ├── config.py           Settings (env vars)
│   │   ├── database.py         Engine SQLAlchemy (SQLite ou Postgres)
│   │   ├── models.py           14 tables (User, Household, Member, Account,
│   │   │                       Transaction, Asset, Liability, Category,
│   │   │                       CategorisationRule, Budget, Goal, Achievement,
│   │   │                       PasswordResetToken, WealthSnapshot)
│   │   ├── auth.py             JWT helpers (python-jose) + bcrypt
│   │   ├── schemas.py          Pydantic I/O models
│   │   ├── defaults.py         Catégories par défaut
│   │   ├── email_service.py    Resend client (best-effort, never raises)
│   │   └── routers/
│   │       ├── auth.py         /auth/register, /login, /me,
│   │       │                   /forgot-password, /reset-password
│   │       ├── members.py      CRUD membres du foyer
│   │       ├── accounts.py     CRUD comptes bancaires
│   │       ├── transactions.py CRUD + bulk import
│   │       ├── wealth.py       CRUD actifs / passifs +
│   │       │                   /wealth/snapshots (history)
│   │       ├── other.py        Categories, budgets, goals,
│   │       │                   achievements, rules, migration
│   │       └── categorize.py   Catégorisation regex + AI Haiku
│   ├── tests/                  pytest — 25 tests couvrent auth, password
│   │                           reset, snapshots, rules
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt    + pytest, pytest-cov
│   └── .env.example
│
├── frontend/                   React 18 + Vite + Tailwind v4
│   ├── public/
│   │   ├── manifest.webmanifest    PWA manifest
│   │   ├── icon.svg                Favicon + PWA (256-bit gold W mark)
│   │   ├── icon-maskable.svg       Android adaptive
│   │   └── sw.js                   Service worker (network-first shell,
│   │                               cache-first hashed assets)
│   ├── src/
│   │   ├── main.jsx                Entry — registers SW in prod only
│   │   ├── App.jsx                 Auth gating + demo mode + reset_token
│   │   ├── AuthScreen.jsx          login | register | forgot | reset modes
│   │   ├── WealthlyApp.jsx         🐉 Monolithe ~4500 lignes — toutes les
│   │   │                           vues + tous les Styles CSS-in-JS
│   │   ├── TaxSimulator.jsx        Vue Impôts (revenus 2025)
│   │   ├── taxFr.js                Moteur fiscal FR (barème, parts,
│   │   │                           crédits, plafonds)
│   │   ├── pdfReport.js            Générateur PDF bilan (jsPDF)
│   │   ├── demoData.js             Jeu de données fictives
│   │   ├── api.js                  Client HTTP (JWT, CORS-aware)
│   │   └── index.css               Design tokens Tailwind v4
│   ├── index.html                  Manifest + apple-touch-icon liens
│   ├── vite.config.js
│   └── package.json
│
├── .github/workflows/test.yml      CI : pytest sur push + PR
├── README.md                       Ce fichier
├── ROADMAP.md                      Statut + idées
├── CLAUDE.md                       Notes pour reprise par Claude
├── QUICKSTART.md                   Ancien guide local (obsolète)
├── docker-compose.yml              Local dev avec Docker (optionnel)
└── LICENSE
```

---

## Tests

```bash
cd backend
pip install -r requirements-dev.txt
pytest -v
```

Les tests utilisent une SQLite en mémoire. Le service email est mocké (pas d'appel Resend en CI).

CI GitHub Actions (`.github/workflows/test.yml`) tourne automatiquement à chaque push sur `main` et chaque PR. Échec → mail aux mainteneurs.

---

## Sécurité

- ✅ HTTPS partout (TLS via Vercel, Railway, Supabase)
- ✅ Mots de passe hashés bcrypt (`passlib`)
- ✅ JWT signé HMAC, expire 7 jours
- ✅ Reset token : SHA-256 stocké en DB, single-use, expire 60 min, génération nouvelle invalide les anciens
- ✅ `forgot-password` ne révèle jamais si l'email existe (même réponse pour adresses connues / inconnues)
- ✅ CORS allowlist regex
- ✅ Tests automatiques sur tous les flows critiques d'auth
- ⚠️ **À vérifier en prod** : `SECRET_KEY` doit être une vraie clé aléatoire ≥32 caractères, **pas** la valeur par défaut `CHANGE_ME_IN_PRODUCTION_PLEASE`
- ❌ Pas de 2FA (à venir)
- ❌ Pas de journal de connexion (à venir)

---

## Dépannage

### "Impossible de joindre le serveur"
Soit le backend Railway est down, soit CORS rejette ton domaine. Test rapide :
```bash
curl https://wealthly-production-45aa.up.railway.app/health
# Attendu : {"status":"ok","version":"2.0.0"}
```
Si le `/health` répond mais l'app non, c'est CORS — vérifier que `CORS_ORIGIN_REGEX` couvre l'URL du frontend.

### Mail "mot de passe oublié" non reçu
1. **Resend logs** → https://resend.com/emails — chercher la tentative récente
2. Si "failed" + 403 : tu utilises l'expéditeur `onboarding@resend.dev` qui ne livre **qu'à l'email du compte Resend**. Solution : (a) tester avec cet email, ou (b) vérifier un domaine dans Resend
3. Si rien dans Resend : Railway → Logs, chercher `[email]` — tu verras s'il y a une erreur ou si la clé manque
4. Vérifier les spams

### CI échoue après un commit
GitHub → Actions → cliquer le run rouge → ouvrir le job pour voir l'erreur. Souvent un test cassé par un changement de schéma — corriger et repush.

### Réinitialiser le mot de passe d'un compte de test
Pas de UI admin. Solution : se connecter à Supabase → Table editor → `users` → modifier la ligne. Ou utiliser le flow "mot de passe oublié" en ayant configuré Resend.

---

## Licence

MIT — voir [LICENSE](LICENSE).
