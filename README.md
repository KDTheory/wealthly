# Wealthly — Patrimoine privé

Application web de **gestion patrimoniale familiale** auto-hébergée. Comptes bancaires, immobilier, placements, prêts, budgets, suivi mensuel, simulateur d'impôt FR, **score de santé financière**, KPIs gestion privée et historique du patrimoine.

> **Production** : https://wealthly-six.vercel.app

| | |
|---|---|
| Frontend | React 18 + Vite + Tailwind v4 + Recharts — déployé sur **Vercel** |
| Typo | DM Sans (UI) + DM Mono (chiffres tabular) |
| Backend | FastAPI + SQLAlchemy + Alembic + slowapi — déployé sur **Railway** |
| Database | Postgres hébergé sur **Supabase** |
| Email | **Resend** (mot de passe oublié) |
| AI | Claude Haiku (catégorisation, optionnel, BYOK) |
| Auth | JWT (bcrypt + python-jose), rate-limited, stocké en localStorage |
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
- **Auth complète** : inscription, connexion, JWT 7 jours, **mot de passe oublié** (lien email Resend, token single-use, expire 60 min). Rate-limiting par IP : 10 login/min, 5 register/min, 5 forgot-password/min.
- **Multi-membres** : foyer = un compte admin + plusieurs membres (adultes / enfants), comptes joints partagés automatiquement.
- **Import CSV** : détection auto de la banque (Revolut, Crédit Agricole, Boursorama, LCL, BNP, etc.), mapping colonnes, prévisualisation.
- **Synchro bancaire DSP2** (optionnelle) : connexion via **GoCardless Bank Account Data**, sync à chaque connexion admin (cron à venir). Consentement DSP2 valable 90 jours. Dédup sur identifiant bancaire stable.
- **Catégorisation hybride** : règles regex intégrées → règles regex personnalisées → Claude Haiku (BYOK) → "non catégorisé".

### Vues (sidebar gauche desktop, bottom-nav mobile)
- **Résumé** — net worth hero giant (clamp 46→84 px sur sparkline gold), perf pill 1M inline, KPI strip secondaire, **score santé financière 0-100** (jauge SVG + 5 critères pondérés), anomalies, allocation, top dépenses, comptes, activité récente, **export PDF** d'un bilan 3 pages.
- **Patrimoine** — actifs / passifs / allocation par classe (donut), KPIs gestion privée, courbe d'évolution avec toggle brut / net / financier + sélecteur de période, sub-views par classe d'actifs.
- **Mensuel** (hub) — Vue mensuelle (charges fixes, reste à vivre, calendrier), Cashflow (Sankey income → expenses), Budgets (50/30/20 + plafonds par catégorie).
- **Transactions** — table sortable avec **panel de filtres avancés** : multi-cat (revenus / dépenses groupés avec compteurs), multi-comptes, multi-membres, plage de dates, montant min/max, type. Badge or sur le bouton Filtres avec compte de filtres actifs.
- **Impôts** — **simulateur d'impôt FR 2025** (barème, parts fiscales, plafond quotient, décote, crédits garde d'enfants + CESU avec plafond niches fiscales 10 000 €).
- **Réglages** — membres, comptes, règles de catégorisation custom, **connexions bancaires DSP2**, export/import backup JSON.

### Mode démo
Bouton "Voir avec un jeu de démo" sur l'écran de connexion → app pré-remplie (Alice + Bob + Léa, 6 mois de transactions, immo + PEA + AV + prêt). Aucune inscription, aucune écriture en base.

### Design system
Direction "encre profonde + or sobre + sage / terracotta sourds" (Pictet / Edmond de Rothschild mood). Tokens partagés entre `index.css` (Tailwind `@theme`) et `Styles.jsx` (CSS-in-JS). Dark mode forcé. Pas de translateY au hover, pas d'ombres colorées, tabular-nums sur tous les chiffres, radii sharps (4 / 8 / 12 / 16).

### PWA installable
Manifest, service worker, icônes (gold W on dark + maskable). "Ajouter à l'écran d'accueil" depuis Safari iOS / Chrome Android → app plein écran avec bottom-nav.

---

## Architecture & topologie

```
   Browser
      │ HTTPS
      ▼
   Vercel (Frontend statique React)
      │ /api/* → CORS regex match
      ▼
   Railway (FastAPI Python — slowapi rate limit + Alembic)
      │ Postgres TLS
      ▼
   Supabase (DB hébergée)

   Resend  ◄── backend (mot de passe oublié)
   GoCardless ◄── backend (synchro bancaire DSP2, EU)
```

**CORS** : le backend accepte tout `https://wealthly(-…)?\.vercel\.app` via une regex (`CORS_ORIGIN_REGEX`), donc chaque nouveau déploiement Vercel marche automatiquement.

**Auth** : JWT signé avec `SECRET_KEY` (env Railway). Le token est stocké dans `localStorage` côté navigateur sous `wealthly:token`. Boot optimiste : l'app rentre directement si un token est présent et vérifie `/auth/me` en arrière-plan (évite le freeze sur Railway froid). Rate limiting par IP sur les 3 endpoints sensibles.

**Schéma DB** : `Base.metadata.create_all()` crée les tables au boot. Alembic est posé en parallèle (auto-stamp de la baseline si pas de `alembic_version` table) pour porter les futures modifs schémas.

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
| `SECRET_KEY` | **oui en prod** | `CHANGE_ME_IN_PRODUCTION_PLEASE` | Clé HMAC pour signer les JWT. **≥32 caractères aléatoires en prod.** |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | non | `10080` (7 jours) | Durée de vie du JWT |
| `CORS_ORIGINS` | non | `http://localhost:3000,http://localhost:5173` | Liste exacte d'origines autorisées (CSV) |
| `CORS_ORIGIN_REGEX` | non | `^https://wealthly(-[a-z0-9-]+)?\.vercel\.app$` | Pattern d'origines autorisées — couvre tous les déploiements Vercel |
| `ANTHROPIC_API_KEY` | non | — | Active la catégorisation IA Claude Haiku |
| `RESEND_API_KEY` | non | — | Sans elle, le flow "mot de passe oublié" est silencieux (logs uniquement) |
| `EMAIL_FROM` | non | `Wealthly <onboarding@resend.dev>` | Avec l'adresse par défaut, **Resend free tier ne livre qu'à l'email du compte Resend**. Vérifier un domaine sur resend.com pour envoyer à n'importe qui. |
| `FRONTEND_URL` | non | `https://wealthly-six.vercel.app` | Base URL pour construire les liens de reset |
| `GOCARDLESS_SECRET_ID` | non | — | Active la synchro bancaire DSP2 (compte gratuit sur https://bankaccountdata.gocardless.com) |
| `GOCARDLESS_SECRET_KEY` | non | — | À côté de `SECRET_ID`. Sans les 2, la section "Connexions bancaires" est désactivée |
| `GOCARDLESS_REDIRECT_URI` | non | `https://wealthly-six.vercel.app/bank-callback` | Doit pointer vers la page `/bank-callback` du frontend |
| `GOCARDLESS_ACCESS_VALID_DAYS` | non | `90` | Durée du consentement en jours (max 90) |
| `GOCARDLESS_HISTORICAL_DAYS` | non | `90` | Profondeur d'historique pull à la première synchro |

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

---

## Structure du repo

```
wealthly/
├── backend/                        FastAPI + SQLAlchemy + Alembic
│   ├── alembic.ini                 Alembic config (URL via env)
│   ├── alembic/
│   │   ├── env.py                  Loads Settings.DATABASE_URL
│   │   ├── script.py.mako          Revision template
│   │   └── versions/
│   │       └── 0001_baseline.py    Marker — current schema
│   ├── app/
│   │   ├── main.py                 Entrée + CORS + rate_limiter +
│   │   │                           startup hooks (create_all → lightweight
│   │   │                           migrations → alembic stamp/upgrade)
│   │   ├── config.py               Settings (env vars)
│   │   ├── database.py             Engine SQLAlchemy
│   │   ├── models.py               17 tables ORM
│   │   ├── auth.py                 JWT helpers + bcrypt
│   │   ├── rate_limit.py           slowapi Limiter + 429 handler FR
│   │   ├── schemas.py              Pydantic I/O models
│   │   ├── defaults.py             Catégories par défaut
│   │   ├── email_service.py        Resend client (best-effort, never raises)
│   │   ├── routers/
│   │   │   ├── auth.py             register, login, me, forgot, reset (rate-limited)
│   │   │   ├── members.py          CRUD membres du foyer
│   │   │   ├── accounts.py         CRUD comptes bancaires
│   │   │   ├── transactions.py     CRUD + bulk import
│   │   │   ├── wealth.py           CRUD actifs / passifs + snapshots
│   │   │   ├── other.py            Categories, budgets, goals, rules
│   │   │   ├── categorize.py       Regex + AI Haiku
│   │   │   ├── banks.py            GoCardless DSP2 — connect / sync
│   │   │   └── fixed_charges.py    Charges fixes mensuelles
│   │   └── services/
│   │       └── gocardless.py       httpx client GoCardless
│   ├── tests/                      pytest — 25+ tests (auth, password reset,
│   │                               snapshots, rules, banks, fixed charges)
│   ├── pytest.ini
│   ├── requirements.txt
│   ├── requirements-dev.txt
│   └── .env.example
│
├── frontend/                       React 18 + Vite + Tailwind v4
│   ├── public/
│   │   ├── manifest.webmanifest
│   │   ├── icon.svg                Brand mark (gold W on near-black)
│   │   ├── icon-maskable.svg       Android adaptive
│   │   └── sw.js                   Service worker (network-first shell)
│   ├── src/
│   │   ├── main.jsx                Entry — registers SW in prod only
│   │   ├── App.jsx                 Auth gate + demo + reset_token + optimistic boot
│   │   ├── AuthScreen.jsx          login | register | forgot | reset modes
│   │   ├── WealthlyApp.jsx         Main shell — data layer + sidebar/nav + view router
│   │   │                           (~1100 lignes — était 6 386 avant la découpe)
│   │   ├── TaxSimulator.jsx        Vue Impôts (lazy-loaded)
│   │   ├── BankCallback.jsx        Landing post bank-OAuth (lazy-loaded)
│   │   ├── Styles.jsx              CSS-in-JS global — pairs with index.css
│   │   ├── constants.js            STORAGE_KEYS, DEFAULT_CATEGORIES/RULES,
│   │   │                           BANK_PROFILES, ASSET/LIABILITY_TYPES, MEMBER_PALETTE
│   │   ├── storage.js              localStorage wrapper
│   │   ├── utils.js                formatCurrency/Date, CSV parse, categorize,
│   │   │                           detectRecurring (no React)
│   │   ├── taxFr.js                Pure tax engine (barème + parts + crédits)
│   │   ├── pdfReport.js            jsPDF bilan generator (dynamic import on click)
│   │   ├── demoData.js             Seed for demo mode
│   │   ├── api.js                  HTTP client (demo-aware)
│   │   ├── index.css               Tailwind v4 + custom @theme tokens (DM Sans/Mono)
│   │   ├── components/
│   │   │   ├── Toast.jsx           Stateless toast renderer
│   │   │   ├── AnimatedNumber.jsx  rAF-tweened currency display (memoized)
│   │   │   ├── NetWorthChart.jsx   Brut/Net/Financier + period selector
│   │   │   └── HealthScore.jsx     0-100 SVG gauge + 5-criteria breakdown
│   │   ├── hooks/
│   │   │   └── useIsNarrow.js      Viewport breakpoint hook
│   │   └── views/
│   │       ├── Dashboard.jsx       Net worth hero + KPIs + score santé + recent
│   │       ├── Wealth.jsx          Patrimoine + tous les editors / 5-step wizards
│   │       ├── Monthly.jsx         Vue mensuelle + FixedChargeEditor (modal)
│   │       ├── Cashflow.jsx        Sankey + donut + SankeyNode (memoized)
│   │       ├── Budgets.jsx         50/30/20 + GoalEditor (modal)
│   │       ├── Transactions.jsx    Table + panel filtres avancés
│   │       ├── Analysis.jsx        Évolution + top marchands
│   │       ├── Settings.jsx        Membres + comptes + rules + bank connections
│   │       ├── ImportFlow.jsx      CSV wizard 4 étapes + MappingField
│   │       └── Onboarding.jsx      First-launch wizard 3 étapes
│   ├── index.html                  Manifest + iOS metas + dark-flash inline style
│   ├── vite.config.js              Tailwind plugin + manualChunks (recharts/lucide/jspdf)
│   └── package.json
│
├── .github/workflows/test.yml      CI : pytest sur push + PR
├── README.md                       Ce fichier
├── ROADMAP.md                      Statut + prochaines étapes
├── CLAUDE.md                       Notes pour reprise par Claude
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

Les tests utilisent une SQLite en mémoire. Le service email est mocké (pas d'appel Resend en CI). Le rate-limiter slowapi est désactivé en tests pour éviter les 429 sur les fixtures qui spam les endpoints.

CI GitHub Actions (`.github/workflows/test.yml`) tourne automatiquement à chaque push sur `main` et chaque PR.

---

## Sécurité

- ✅ HTTPS partout (TLS via Vercel, Railway, Supabase)
- ✅ Mots de passe hashés bcrypt (`passlib`)
- ✅ JWT signé HMAC, expire 7 jours
- ✅ **Rate limiting par IP** sur `/auth/login` (10/min), `/auth/register` (5/min), `/auth/forgot-password` (5/min) via slowapi
- ✅ Reset token : SHA-256 stocké en DB, single-use, expire 60 min, génération nouvelle invalide les anciens
- ✅ `forgot-password` ne révèle jamais si l'email existe (même réponse pour adresses connues / inconnues)
- ✅ CORS allowlist regex
- ✅ Tests automatiques sur tous les flows critiques d'auth
- ⚠️ **À vérifier en prod** : `SECRET_KEY` doit être une vraie clé aléatoire ≥32 caractères, **pas** `CHANGE_ME_IN_PRODUCTION_PLEASE`
- ⚠️ **JWT en localStorage** (XSS-vulnerable) — migration vers httpOnly cookies prévue (voir ROADMAP)
- ❌ Pas de 2FA — TOTP prévu (voir ROADMAP)
- ❌ Pas de journal de connexion — prévu (voir ROADMAP)

---

## Dépannage

### "Impossible de joindre le serveur"
Soit le backend Railway est down, soit CORS rejette ton domaine. Test rapide :
```bash
curl https://wealthly-production-45aa.up.railway.app/health
# Attendu : {"status":"ok","version":"2.0.0"}
```
Si le `/health` répond mais l'app non, c'est CORS — vérifier que `CORS_ORIGIN_REGEX` couvre l'URL du frontend.

### "Trop de tentatives. Réessaie dans quelques instants."
Tu as dépassé le rate limit (10 login / 5 register / 5 forgot-password par minute par IP). Attends 1 minute. Si tu déboggues et veux désactiver temporairement : `app.state.limiter.enabled = False` dans `backend/app/main.py`.

### Mail "mot de passe oublié" non reçu
1. **Resend logs** → https://resend.com/emails — chercher la tentative récente
2. Si "failed" + 403 : tu utilises l'expéditeur `onboarding@resend.dev` qui ne livre **qu'à l'email du compte Resend**. Solution : (a) tester avec cet email, ou (b) vérifier un domaine dans Resend
3. Si rien dans Resend : Railway → Logs, chercher `[email]` — tu verras s'il y a une erreur ou si la clé manque
4. Vérifier les spams

### CI échoue après un commit
GitHub → Actions → cliquer le run rouge → ouvrir le job pour voir l'erreur. Souvent un test cassé par un changement de schéma — corriger et repush.

### Réinitialiser le mot de passe d'un compte de test
Pas de UI admin. Solution : se connecter à Supabase → Table editor → `users` → modifier la ligne. Ou utiliser le flow "mot de passe oublié" en ayant configuré Resend.

### Alembic au boot dit `[alembic] sync failed`
Non-fatal — `create_all()` a déjà créé les tables et l'app fonctionne. L'erreur est loggée dans les logs Railway. Causes typiques :
- `alembic.ini` introuvable (chemin courant ≠ project root)
- Permissions DB insuffisantes pour créer la table `alembic_version`
- Une migration buggy dans `alembic/versions/`

---

## Licence

MIT — voir [LICENSE](LICENSE).
