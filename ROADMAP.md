# Trove — Roadmap

État au **2026-05-10** — refonte complète Wealthly → Trove (design, landing, rebrand, admin panel v1, security toolbox).

---

## ✅ Livré

### Rebrand & landing (Raphyy31 — 2026-05-09/10)
- [x] **Rebrand Wealthly → Trove** (logo, nom, manifest, HTML title, AuthScreen)
- [x] **Landing page v2** — sections Fonctionnement / Fonctionnalités / Sécurité / Tarifs (3 plans) / FAQ / CTA final
- [x] **Page Tarifs** : Solo 0€ / Pro 7,99€/mois / Famille 14,99€/mois — toggle Mensuel/Annuel (−20 %)
- [x] **Sidebar app** restructurée en 3 groupes : VUE D'ENSEMBLE / GESTION / CONFIGURATION
- [x] **Dashboard v2** : hero "Bonsoir" + courbe interactive + Insights + Objectifs + cards comptes
- [x] **demoData.js** réécrit (comptes à soldes réalistes, transactions Paris cadre, LCL compte joint positif)

### Sécurité backend (Raphyy31 — 2026-05-10)
- [x] **`security.py`** — audit log (`record_auth_event`), brute-force lockout (5 échecs/15 min → blocage 30 min), HIBP k-anonymity password check, CSP + HSTS + X-Frame-Options + headers complets
- [x] **`AuthEvent` table** — journal de connexions (IP, UA, kind, success, created_at)
- [x] **`User.is_admin`** et **`User.full_name`** — champs admin et nom complet
- [x] **`/admin` router backend** — `GET /admin/stats`, `GET /admin/auth-events`, `GET /admin/users` (protégé par `require_admin`)
- [x] **`Admin.jsx` frontend** — KPIs sécurité, table événements, table users (visible seulement si `is_admin`)
- [x] **Multi-currency hooks** (`useBaseCurrency`, `useQuotes`, `useRates`) + service quotes Frankfurter/Yahoo

### Sécurité précédente (2026-05-06)
- [x] Rate limiting auth (slowapi) : login 10/min, register 5/min, forgot-password 5/min
- [x] CORS regex pour tous les deploys Vercel
- [x] JWT signé 7 jours, bcrypt passwords, SHA-256 reset tokens
- [x] Alembic infrastructure (auto-stamp baseline)
- [x] 25+ tests pytest (auth, reset, snapshots, rules, banks) + CI GitHub Actions

### Fonctionnalités core (sessions précédentes)
- [x] Gestion multi-membres foyer (adultes + enfants), comptes bancaires avec rôles cashflow
- [x] Import CSV (détection auto banque), synchro PSD2 GoCardless (90j consent, dedup external_id)
- [x] Transactions : filtres multi-critères, catégorisation regex + IA Claude Haiku (BYOK), virements internes (auto-detect + override manuel)
- [x] Patrimoine : actifs/passifs, snapshots mensuels, plus-values latentes, plafonds PEA/Livret A
- [x] Score santé 0-100 (jauge SVG, 5 critères), Cashflow Sankey, 50/30/20 budgets, objectifs épargne
- [x] Simulateur IR 2025 FR (barème, parts, crédits, niches 10 000 €)
- [x] PDF bilan dark multi-pages, PWA installable, i18n FR/EN (partiel)
- [x] Mot de passe oublié (Resend, 60 min, single-use)

---

## 🐛 Bugs connus — corriger avant toute demo externe

> Identifiés le 2026-05-10 par navigation directe sur la démo live.

### Demo data — incohérences critiques

| # | Problème | Fichier | Fix |
|---|----------|---------|-----|
| 1 | **Double logement** : "Virement loyer 14 rue de Vaugirard" −1 400 €/mois + "Échéance prêt immobilier" −1 150 €/mois. Un propriétaire ne paie pas de loyer. Double comptage housing = 2 550 €/mois. | `frontend/src/demoData.js` | Remplacer "Virement loyer" par "Charges de copropriété" −250 €/mois |
| 2 | **YTD +1257 %** sur le hero — absurde. Probablement aucun `wealthSnapshots` dans `getDemoData()` → calcul compare à 0. | `frontend/src/demoData.js` + Dashboard | Ajouter des snapshots réalistes dans le seed (6 mois, +3–5 %/an) |
| 3 | **Widget "Activité récente"** : libellés "—" et "Non catégorisé" sur le Dashboard, alors que /transactions affiche tout correctement. Régression post-refonte. | `frontend/src/views/Dashboard.jsx` | Vérifier le mapping `label` / `categoryId` dans le composant |
| 4 | **Donut "NET" faux** : affiche ~515 000 € (somme brute actifs) au lieu du patrimoine net ~284 000 €. | `frontend/src/views/Dashboard.jsx` | Corriger le calcul ou changer le label en "ACTIFS BRUTS" |

### Budget mensuel réaliste — persona cible

**Couple Paris : Alice 3 850 €/mois + Bob 3 220 €/mois, propriétaires, 1 enfant (Léa)**

```
REVENUS                         7 070 €
Prêt immobilier (seul item)    −1 150 €
Charges copropriété              −250 €  ← remplace le loyer erroné
Crèche Léa                       −680 €
EDF + Free Box                   −127 €
Assurances (habitation + auto)    −96 €
CESU Mme Sanchez                 −160 €
Abonnements (Netflix+Spotify+sport)  −68 €
Carburant                        −140 €
Courses (Carrefour+Monoprix+Naturalia)  −348 €
Restaurants + loisirs            −116 €
Épargne Livret A                 −600 €
─────────────────────────────────────
RESTE À VIVRE                  3 335 €  (47 % d'épargne — excellent, crédible)
```

---

## 🔜 À faire — priorisé

### 🔴 P0 — Migration Alembic (bloquant pour prod)

Les nouvelles tables/colonnes (`AuthEvent`, `User.is_admin`, `User.full_name`) existent via `create_all()` mais **aucune revision Alembic n'existe**. Sur une DB existante, ces colonnes sont absentes → admin panel cassé en prod.

- [ ] `alembic revision --autogenerate -m "add_auth_events_admin_fields"` et vérifier le diff
- [ ] Ajouter `User.is_active` si absent (nécessaire pour suspension utilisateur)
- [ ] Tester la revision sur la DB Supabase Railway avant de pousser

### 🔴 P0 — Créer les 2 comptes admin

Aucun moyen de créer un admin sans accès DB direct. Besoin d'un script :

- [ ] `backend/scripts/seed_admins.py` — crée/met à jour les comptes kdtheory + Raphyy31 avec `is_admin=True`
- [ ] Variables d'env : `ADMIN_EMAIL_1`, `ADMIN_PASSWORD_1`, `ADMIN_EMAIL_2`, `ADMIN_PASSWORD_2`
- [ ] Lancer via `railway run python backend/scripts/seed_admins.py` (one-shot)

### 🔴 P0 — Corriger les 4 bugs démo (tableau ci-dessus)

### 🟠 P1 — JWT → httpOnly cookies

Actuellement le JWT est dans `localStorage` → accessible à tout JS injecté. La section Sécurité de la landing le présente comme une feature — c'est une erreur à corriger aussi.

**Backend** (`backend/app/routers/auth.py`) :
- [ ] `POST /auth/login` → `Set-Cookie: trove_token=...; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=604800`
- [ ] `GET /auth/me` → lire cookie en priorité (fallback Bearer header pour compatibilité)
- [ ] `POST /auth/logout` → effacer le cookie (`Max-Age=0`) + endpoint frontend

**Backend** (`backend/app/main.py`) :
- [ ] CORS : ajouter `allow_credentials=True`

**Frontend** :
- [ ] `api.js` → `credentials: 'include'` sur tous les fetch
- [ ] `App.jsx` + `AuthScreen.jsx` → supprimer les `localStorage` du token
- [ ] Landing `Sécurité` : supprimer/reformuler la phrase "Un JWT en localStorage, c'est tout"

### 🟠 P1 — 2FA TOTP (obligatoire pour admins)

- [ ] Table `totp_secrets` (user_id, secret, backup_codes JSON, verified_at)
- [ ] `POST /auth/totp/setup` → génère secret PyOTP + URI QR
- [ ] `POST /auth/totp/verify` → active le TOTP
- [ ] `POST /auth/totp/disable` → désactive (admin seulement)
- [ ] Flow login modifié : si TOTP actif → retourner `{ requires_totp: true, partial_token }` → frontend step 2
- [ ] Middleware admin : bloquer `/admin/*` si TOTP non vérifié pour les `is_admin`
- [ ] Frontend `AuthScreen.jsx` : écran "Entrez votre code 2FA" (6 chiffres + backup code)
- [ ] `Settings.jsx` : section "Sécurité du compte" — activer/désactiver TOTP + afficher backup codes

### 🟡 P2 — Admin panel — actions manquantes

Panel actuel = lecture seule. À ajouter :

- [ ] `PUT /admin/users/{id}/toggle-active` — suspendre/réactiver (toggle `is_active`) + audit log
- [ ] `DELETE /admin/users/{id}` — suppression avec confirmation (soft delete recommandé)
- [ ] Frontend : boutons Suspendre / Réactiver / Supprimer dans la table users
- [ ] Pagination sur `/admin/auth-events` (actuellement limité à 100)

### 🟡 P2 — Cron bank sync + alertes DSP2

- [ ] `POST /internal/sync-all-banks` protégé par header `X-Cron-Secret`
- [ ] Cron Railway planifié 1×/jour à 6h UTC
- [ ] Email Resend J-7 avant expiration consentement (90 jours)

### 🔵 P3 — Docker self-hosting production-grade

- [ ] Audit `docker-compose.yml` actuel (volumes, restart policies, healthchecks)
- [ ] `docker-compose.prod.yml` avec Caddy (TLS auto) + Postgres local + backend + frontend
- [ ] Images publiées sur GHCR
- [ ] `SELF_HOSTING.md` : guide install, backup, mise à jour, variables d'env

### ⚪ Plus tard

- [ ] **Multi-devise complet** : brancher les hooks `useQuotes`/`useRates`/`useBaseCurrency` (déjà créés) sur le frontend
- [ ] **Tests frontend vitest** : moteur fiscal `taxFr.js`
- [ ] **Stripe paywall** : Solo 0€ / Pro 7,99€ / Famille 14,99€ — landing prête, backend à faire
- [ ] **Vérification trademark "Trove"** (EUIPO/INPI/USPTO) + achat domaine
- [ ] **Architecture multi-pays** : champ `country` sur households, gating composants FR-only
- [ ] **TypeScript** : migration progressive si friction concrète

---

## 🎨 Design — Raphyy31 (cette semaine)

- [ ] Revue complète avec Claude Design (direction visuelle landing + app)
- [ ] Mettre à jour les mockups dans la landing (affichent encore "Wealthly")
- [ ] Remettre le toggle i18n FR/EN visible dans l'UI
- [ ] Cohérence design entre landing (gradient violet/bleu) et app intérieure

---

## 🚫 Hors scope

- ❌ Rebalancing automatique d'allocation
- ❌ Garde alternée dans le simulateur d'impôt
- ❌ Mode clair (dark-only)
- ❌ Agent IA réseaux sociaux (réservé post-commercialisation)

---

## 📅 Sessions

**2026-05-10 — Analyse live + planification sécurité (kdtheory + Claude)**
Navigation directe sur la démo Trove. Bugs identifiés : double loyer demoData (propriétaire + loyer = impossible), YTD +1257 % absurde, widget Activité récente cassé (libellés "—"), donut label "NET" faux (515 k vs 284 k). Analyse persona réaliste : couple Paris 7 070 €/mois + enfant. Pull repo → découverte push massif Raphyy31 : security.py (audit log, lockout, HIBP, CSP), admin.py + Admin.jsx (panel lecture seule), multi-currency hooks. TODO réorganisée P0/P1/P2/P3.

**2026-05-08/09 — Refonte Trove (Raphyy31)**
Rebrand Wealthly → Trove. Landing v2 (tarifs 3 plans, FAQ, sécurité, fonctionnement). Dashboard v2 (hero, courbe interactive, Insights, Objectifs). Sidebar restructurée. demoData.js réécrit. security.py + admin.py + Admin.jsx livrés. Hooks multi-devise.

**2026-05-08 — Account roles + transfer detection (kdtheory)**
5 rôles cashflow/compte, détection virements internes auto (±3j, ±1 %), override manuel tri-state, section Mouvements internes Dashboard.

**2026-05-06 — Investor-ready push (Raphyy31 + kdtheory)**
Refonte visuelle Méridien, découpe WealthlyApp.jsx −82 %, rate limiting, Alembic, filtres transactions, score santé SVG, plus-values latentes, plafonds régulés, PDF dark, i18n FR/EN.

**2026-05-05 — Session fondatrice**
Stack, import CSV, PWA, simulateur IR, DSP2, budgets, snapshots, reset password, mode démo.
