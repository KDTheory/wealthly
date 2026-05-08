# CLAUDE.md — context for AI assistants

Notes for Claude (and any future AI tooling) picking the project back up.
**Read this first** before making non-trivial changes.

---

## Stack & deployment

| Layer | Tech | Where |
|---|---|---|
| Frontend | React 18 + Vite + Tailwind v4 + Recharts | Vercel (auto-deploy from `main`) |
| Backend | FastAPI + SQLAlchemy 2 + Pydantic 2 | Railway (auto-deploy from `main`) |
| Database | Postgres | Supabase |
| Email | Resend (HTTP API via httpx) | Backend `app/email_service.py` |
| AI | Anthropic Claude Haiku (categorization, BYOK) | Backend `app/routers/categorize.py` |
| CI | pytest + GitHub Actions | `.github/workflows/test.yml` |

**Production URL** : https://wealthly-six.vercel.app (Vercel preview hashes also work via CORS regex).
**Backend URL** : https://wealthly-production-45aa.up.railway.app
**Repo** : https://github.com/Raphyy31/wealthly

User's machine has: Homebrew, gh CLI (authenticated as `Raphyy31`), Git. **No node, no Docker, no Python locally**. So:
- Cannot run `npm install` / `npm run build` / `pytest` locally.
- Visual validation always happens on Vercel after push.
- User pushes commits **directly to `main`** (no feature branches, no PRs). Vercel auto-deploys.

---

## Repository layout

```
backend/
  app/
    main.py              FastAPI app + CORS middleware
    config.py            Settings class (env vars)
    database.py          Engine (SQLite or Postgres) + Base + get_db
    models.py            14 ORM tables
    schemas.py           Pydantic input/output models
    auth.py              JWT helpers (python-jose) + bcrypt password hashing
    defaults.py          Default category seed list
    email_service.py     Resend client. NEVER raises (returns False on failure).
    routers/
      auth.py            register, login, me, forgot-password, reset-password
      members.py         CRUD members
      accounts.py        CRUD bank accounts
      transactions.py    CRUD + bulk import
      wealth.py          CRUD assets, liabilities, wealth snapshots
      other.py           categories, budgets, goals, achievements, rules,
                         migration import
      categorize.py      Regex + AI categorization
      banks.py           GoCardless Bank Account Data — connect/sync flow
    services/
      gocardless.py      Thin httpx client over the GoCardless API
    rate_limit.py        slowapi Limiter + 429 handler (FR detail message)
  alembic.ini            Alembic config (URL via env, never hardcoded)
  alembic/
    env.py               Loads Settings.DATABASE_URL, registers Base.metadata
    script.py.mako       Revision template
    versions/
      0001_baseline.py   Marker — current schema is the baseline
  tests/                 pytest, in-memory SQLite, mocked Resend, limiter disabled
  pytest.ini
  requirements.txt       prod deps (now includes slowapi)
  requirements-dev.txt   + pytest, pytest-cov

frontend/
  public/
    manifest.webmanifest  PWA manifest
    icon.svg              Brand mark (gold W on near-black)
    icon-maskable.svg     Android adaptive icon
    sw.js                 Service worker (network-first shell)
  src/
    main.jsx                       Entry, registers SW in prod only
    App.jsx                        Auth gate + demo mode + reset_token URL handler
    AuthScreen.jsx                 Login | Register | Forgot | Reset modes
    BankCallback.jsx               Landing page after the bank OAuth redirect
    WealthlyApp.jsx                Main shell — data layer + sidebar/nav + view router (~1100 lines)
    TaxSimulator.jsx               Vue Impôts (lazy-loaded)
    Styles.jsx                     Global CSS-in-JS — pairs with index.css
    constants.js                   STORAGE_KEYS, DEFAULT_CATEGORIES/RULES, BANK_PROFILES, ASSET/LIABILITY_TYPES, MEMBER_PALETTE
    storage.js                     Tiny localStorage wrapper for UI prefs
    utils.js                       formatCurrency/Date, CSV parse, categorize, detectRecurring (no React)
    taxFr.js                       Pure tax engine (barème + parts + crédits)
    pdfReport.js                   jsPDF bilan generator (dynamic import on click)
    demoData.js                    Seed for demo mode
    api.js                         HTTP client. Demo-aware: GET returns null, POST throws.
    index.css                      Tailwind v4 + custom @theme tokens
    components/
      Toast.jsx                    Stateless toast renderer
      AnimatedNumber.jsx           rAF-tweened currency display (memoized)
      NetWorthChart.jsx            Brut/Net/Financier toggle + period selector (used by Dashboard + Wealth)
      HealthScore.jsx              0-100 SVG gauge + 5-criteria breakdown (Dashboard widget)
    hooks/
      useIsNarrow.js               Viewport breakpoint hook (used by Cashflow Sankey)
    views/
      Onboarding.jsx               3-step first-launch wizard
      Dashboard.jsx                Net worth hero + KPIs + composition + recent
      Wealth.jsx                   Patrimoine + all asset/liability editors + 5-step wizards
      Monthly.jsx                  Suivi mensuel + FixedChargeEditor (modal)
      Cashflow.jsx                 Sankey + donut + SankeyNode (memoized)
      Budgets.jsx                  50/30/20 + GoalEditor (modal)
      Transactions.jsx             Searchable + sortable + advanced filter panel (multi-cat / accs / members / dates / amount / type)
      Analysis.jsx                 Évolution + top marchands + per-category drill
      Settings.jsx                 SettingsView + CustomRules + BankConnections + InstitutionPicker + MemberEditor
      ImportFlow.jsx               4-step CSV wizard + MappingField (local helper)
  vite.config.js                   Tailwind plugin + /api proxy (dev only) + manualChunks for recharts/lucide/jspdf
  index.html                       PWA + iOS metadata + dark-flash prevention inline style

.github/workflows/test.yml     pytest on push/PR

README.md     User-facing project doc (deployment, features)
ROADMAP.md    What's done + what's next
CLAUDE.md     This file
QUICKSTART.md Outdated, kept for historical reference
```

---

## Visual direction (CRITICAL — don't deviate without asking)

**"Encre profonde + or sobre + sage / terracotta sourds"**.

The user explicitly rejected the earlier teal/emerald (#00d09c) direction on 2026-05-05 — said "fait plus sérieux". Direction settled on private banking (Pictet / Edmond de Rothschild mood), Finary-adjacent, Linear-craft.

Tokens live in two places that must stay in sync:
1. `frontend/src/index.css` `@theme` block — used by Tailwind utilities (`bg-w-surface`, `text-w-muted`)
2. `frontend/src/WealthlyApp.jsx` `Styles({ theme })` `:root` block — used by the monolith CSS-in-JS (`var(--bg-card)`, `var(--primary)`)

Key colors (dark, the primary mode):
- `--color-w-bg` / `--bg-page`: `#0a0b0e`
- `--color-w-surface` / `--bg-card`: `#13151a`
- `--color-w-text` / `--text-primary`: `#ebe8e3` (cream-tinted, NOT pure white — warmth matters)
- `--color-w-accent` / `--primary`: **`#c5a572`** (the signature gold)
- `--color-w-success` / `--success`: `#88a978` (muted sage)
- `--color-w-danger` / `--danger`: `#c47158` (muted terracotta — never a fire-engine red)
- `--color-w-warning` / `--warning`: `#d4a554`

Rules:
- **No translateY hover** — too startup-y. Hovers change colour, not position.
- **No coloured glows** (no `rgba(59, 130, 246, …)` shadows). Borders + subtle bg shifts only.
- **Tabular numerals everywhere** for monetary values (`.w-num` class or `font-variant-numeric: tabular-nums`).
- **Sharper radii** (4 / 8 / 12 / 16) — architectural over playful.
- **Single accent**: gold for CTAs and positive trends. Keep usage rare and load-bearing.

---

## Auth flow

- Register → JWT → stored in `localStorage` as `wealthly:token`.
- Token expires after 7 days.
- `App.jsx` checks the token on mount via `auth.me()`. If invalid → AuthScreen.
- **Reset token URL handling**: if `?reset_token=` is in the URL, App.jsx forces AuthScreen even if logged in. AuthScreen reads it, switches to `reset` mode, scrubs it from the URL.
- **Demo mode**: localStorage flag `wealthly:demo` → App.jsx renders WealthlyApp in demo mode, bypassing all auth. `api.js` short-circuits all API calls in demo mode (GET returns null, mutations throw a "Mode démo" error).

---

## Things that bite

**1. CORS regex must match every Vercel URL.**
The default in `backend/app/config.py` is `^https://wealthly(-[a-z0-9-]+)?\.vercel\.app$`. If the user adds a custom domain, update `CORS_ORIGINS` env var on Railway OR adjust the regex.

**2. Resend free tier sender restriction.**
Default `EMAIL_FROM` is `Wealthly <onboarding@resend.dev>`. With this sender, Resend's free tier **only delivers to the email address used to register on Resend**. Any other recipient → 403 silently. Diagnostic path:
1. https://resend.com/emails — check Logs
2. Railway → Logs — look for `[email]` lines
3. Solution: either test with the Resend account's email, or verify a domain on Resend

**3. WealthlyApp is no longer a monolith.**
L1+L2 of the découpe shipped (commits 955143b → 8663654, 2026-05). The
file dropped from 6386 to ~1100 lines and now owns only the data layer
+ shell + view router. Sub-views live in `src/views/`, leaf components
in `src/components/`, hooks in `src/hooks/`. Sed-based extraction is
risky — the L2.4 Dashboard removal accidentally chewed into the start
of `WEALTH_SUBVIEWS` (fixed in bdd7ed3); always grep the boundary
before deleting.

Remaining work if/when needed:
- L3: split the data layer into hooks (`useMembers`, `useReload`,
  `useTransactions`…) so views can move to a context provider instead
  of receiving everything via props.
- L4: TypeScript? Tests? Out of scope for now.

**4. The frontend tax engine is in `taxFr.js` and is critical.**
- French income brackets 2025 (declared 2026): 0 / 11 497 / 29 315 / 83 823 / 180 294 / ∞
- Plafond quotient familial: 1 791 €/demi-part
- Décote: 889 € (single) / 1 470 € (couple), érosion 45.25%
- Crédit garde enfant <6 ans: 50%, plafond 3 500 €/enfant
- Crédit emploi à domicile (CESU): 50%, plafond 12 000 + 1 500/dépendant, max 15 000
- Plafond global niches fiscales: **10 000 €/foyer**

Update these constants when the law changes (typically late each year for the next year). The user explicitly removed `sharedChildren` (garde alternée) — don't add it back.

**5. The wealth snapshot auto-upsert.**
`WealthlyApp` posts a snapshot whenever net-worth math materially changes. Debounced 1.5s, gated by a useRef. Don't remove the gating — the deps array on the useEffect is intentionally `[netWorth, liquidWealth, assetsValue, liabilitiesValue]` and would otherwise spam the backend every render.

**6. CI tests.**
`pytest` runs against in-memory SQLite. The **email service is mocked** in conftest — DO NOT make password-reset endpoints depend on getting a real Resend response, the test patches `app.routers.auth.send_password_reset_email` and reads the captured emails via `client.sent_emails`. The **slowapi rate limiter is disabled** in conftest (`limiter.enabled = False`) — TestClient runs everything from one synthetic IP and would otherwise burn the budget within 2 cases.

**7. Alembic is set up but not the source of truth (yet).**
`Base.metadata.create_all()` still runs at startup as the fresh-DB safety
net. Alembic infrastructure (alembic.ini, env.py, baseline marker) is
posted in parallel: on first boot against a DB that has tables but no
`alembic_version` row, the startup hook stamps head — treats the current
schema as the baseline so future revisions can run cleanly. Going forward
every schema change should be a real alembic revision; eventually we
remove `create_all()` once we have a few real migrations validated in
prod. **Don't write a "full initial migration"** that re-creates all 17
tables — it would conflict with the existing schema.

**8. Rate limiting on auth.**
`slowapi` is wired on `/auth/login` (10/min), `/auth/register` (5/min),
`/auth/forgot-password` (5/min) per IP. The 429 message is the FR string
`"Trop de tentatives. Réessaie dans quelques instants."` — the existing
toast pipeline surfaces it without a special case. Limiter lives in
`app/rate_limit.py`; main.py and routers/auth.py share the same instance.

---

## When the user says…

| User says | Trigger |
|---|---|
| "reprends le ROADMAP" | Read this file + `ROADMAP.md`, summarize where we left off, ask which item to work on |
| "j'ai des commentaires sur X" | Listen first, gather all the points, propose grouped commits, then execute |
| "pousse tout" | `git status`, commit anything pending, `git push origin main` |
| Pastes an API key | **STOP**. Tell them to revoke it, generate a new one, set it on Railway as env var. Never read or commit the leaked one. |

---

## Latest session — 2026-05-08 (later: account roles + transfer detection)

Real-data discovery: after only connecting Revolut (a travel/online-purchase
wallet, not the user's main account), the dashboard showed nonsense
numbers — net worth €17, savings rate −98 %, etc. Cause: every account
contributed equally to income/expense aggregates regardless of how the
user actually uses it. Two-axis fix shipped:

### Account cashflow roles

Five roles with explicit rules, configurable per account in Réglages:
- **principal** — main account, all flows count (default)
- **depenses** — Revolut-style; outflows ARE expenses, inflows are
  transfers from principal and DO NOT count as income
- **epargne** — Livret/PEL/LDDS; balance counts in NW but flows are
  arbitrages, not cashflow
- **investissement** — PEA/CTO/AV; same as epargne for cashflow
- **professionnel** — fully excluded from personal patrimoine + cashflow

Backend: `accounts.role VARCHAR DEFAULT 'principal' NOT NULL` (+ index),
schema/serializer propagation, lightweight ALTER TABLE on startup.
Frontend: `ACCOUNT_ROLES` table + helpers in utils.js
(`accountIncludeInNetWorth`, `accountCountsAsIncome`,
`accountCountsAsExpense`), aggregator integration in
`monthlyEvolution`, `liquidWealth`, `categoryAnalysis`. Settings UI
shows a per-account `<select>` with each role's tooltip.

### Heuristic role suggestion (`suggestAccountRole`)

When a freshly-imported account is still on the default 'principal',
the Settings UI runs a heuristic on its transactions and proposes a
better role inline: salary pattern (≥2 inflows ≥1 200€ same day-of-
month) → principal; ≥60% virement-labelled inflows + real outflows →
depenses; round inflows + few outflows → epargne; etc. One-click
"Appliquer" on the suggestion.

### Internal transfer detection (`detectInternalTransfers`)

Pair-matches transactions that look like "I moved money between my own
accounts" so cashflow aggregates ignore them. Pure frontend, recomputes
on every visibleTransactions change. Rules:
1. Same |amount| within tolerance `max(1€, 1% of larger leg)` — covers
   Wise/forex commissions
2. Opposite signs
3. Two distinct accounts
4. Within ±3 days (sliding date window)
5. Greedy earliest-first, best amount-match wins

Returns `Set<txId>` with a `.pairs` property exposing
`{ outTxId, inTxId, fromAccountId, toAccountId, amount, date }` so
the UI can render the actual pairs.

### Manual override (`is_transfer_override`)

Backend column on `transactions`, tri-state: null = defer to
auto-detection, true = force-transfer, false = force-not-transfer.
Frontend exposes `setTransferOverride(txId, value)` from WealthlyApp;
effective `transferIds = auto ∪ {override:true} − {override:false}`.
Override is the source of truth so the user can always correct a bad
auto-classification.

UI in Transactions row: gold `↔ Transfert` badge is clickable (= "no,
not a transfer"); a faint `↔` appears on hover for non-detected rows
(= "force this as a transfer"). Both persist immediately.

### Surfacing in the Dashboard

- Section III — Trésorerie footer lists role-based exclusions in serif
  italic ("Exclus du calcul mensuel : Revolut (depenses)…")
- New section `↔ Mouvements internes` lists pair-matched transfers of
  the current month with direction (Boursorama → Livret A : 500€) +
  count + total in the header. Caps at 6.
- Activity recent: ↔ icon + gold "Transfert" pill, dimmed amount.
- Transactions table: "↔ Virement interne" gold pill replaces the
  category pill for detected transfers (clickable to override category).

Commits chronologiques :
- `1ae9c70` cashflow roles (backend + frontend + Settings UI)
- `410f206` initial transfer detection + UI badges
- `b5333fe` forex tolerance widening + auto-suggest role
- `4050283` manual override (backend column) + Mouvements internes
  panel + Virement interne pill

### Known limits / not-yet-shipped

- No "vue partielle" banner (skipped at the user's request) — the user
  is fine seeing approximate data while connecting more accounts.
- Manual transfer override only flags one leg; the *pair* info comes
  from auto-detection only. Manually flagging a tx as transfer doesn't
  reconstruct a counterpart, so it's excluded from cashflow but doesn't
  appear in the Mouvements internes panel.

---

## Latest session — 2026-05-08 (Méridien design pivot)

Direction visuelle revue avec une référence externe ("Direction B —
Méridien" dans `frontend/public/design-b.html` et `design-d.html`,
mockups standalone HTML conservés au cas où). On part désormais sur :
**relevé Pictet** — eyebrow doré "Relevé · …", titres Source Serif 4
avec accent italique or sur le mot-clé, sections numérotées en
chiffres romains italiques (I —, II —, III —…), dotted dividers
façon papier imprimé, hero number serif avec deltas inline 30j/3M/YTD
en serif italique vert/rouge.

Commits chronologiques :
- `505110b` palette + tokens + Source Serif 4 chargée + Dashboard +
  Landing + AuthScreen passés en Méridien
- `83d4e7e` page-headers Méridien sur toutes les vues (Patrimoine,
  Analyse, Transactions, Réglages, Mensuel, Cashflow, Budgets)
- `df32421` chrome (sidebar brand serif), card-header globalement
  upgradé (gold + dotted underline + meta italique), Onboarding /
  ImportFlow / BankCallback / TaxSimulator / AuthScreen modes secondaires
- `4d90961` **Dashboard rebuild fidèle au PDF B** : title+curve sur la
  même ligne, paragraphe sub auto, règle dorée, total NW band avec 3
  deltas inline, 3 sections I/II/III côte à côte avec règles verticales
  (Allocation / Santé / Trésorerie). Sections IV/V/VI en dessous.

### Backup — ancien Dashboard conservé

L'ancien Dashboard (avant le rebuild Méridien) est sauvegardé tel quel
dans `frontend/src/views/Dashboard.legacy.jsx` (486 lignes). Pour
rollback : remplacer dans `WealthlyApp.jsx` l'import
`from './views/Dashboard.jsx'` par `from './views/Dashboard.legacy.jsx'`
— une ligne, retour immédiat à l'ancien design. Le fichier legacy n'est
pas tree-shaken hors d'un import explicite, donc zéro impact bundle.

### Reste à faire (Phase 3+ optionnelle)

- Sparklines compactes sur les KPI (emprunt direction C)
- Mini-sankey dans Cashflow (emprunt C)
- Annotation auto-détectée sur la courbe NetWorthChart ("drawdown
  estival") en serif italique gold
- Empty states éditoriaux

---

## Last work session — 2026-05-06 (investor-ready push, 3 phases)

**Morning**: full visual refonte (hero overhaul, sidebar desktop, mobile
bottom-nav 6 items, palette refinement, DM Sans/Mono fonts, modale
modernization, sober empty states) + complete WealthlyApp découpe
(6 386 → 1 139 lignes via L1 utils/constants/Styles + L2 all 10 views).

**Afternoon**: backend security baseline (slowapi rate limiting on auth),
Alembic infrastructure with auto-stamp baseline, advanced transaction
filters panel (multi-cat / accs / members / dates / amounts / type),
financial health score widget on Dashboard (0-100 SVG gauge + 5-criteria
breakdown).

**Evening**: unrealized gains (purchase_price/date via Alembic + PV %
display), regulatory caps (PEA/Livret A/LDDS), YoY comparison on Suivi
mensuel, account drawer (right slide-in + cross-view tx filter), Finary
loan view rebuild, i18n FR/EN setup with inline FR · EN button (sidebar +
mobile header — out of Settings), AuthScreen polish (radial vignette,
honest copy, gold border-top), PDF rebuild — full dark theme matching the
app, premium Pictet/EdR-style cover (oversized typo + signature gold
rule + 3-card stat grid + "préparé pour" footer + page mark), per-debt
amortization page with capital chart, Unicode sanitize at the doc.text
seam (kills the `/` and `"` glyphs from `Intl.NumberFormat fr-FR`
narrow-NBSP and U+2212 minus). Hotfixes: WEALTH_SUBVIEWS leftover
post-sed crashing the build, SW cache version bump after broken-build
streak, formatDate import missing in Dashboard (black screen post-login).

Roadmap not yet done: JWT → httpOnly cookies (3.2), 2FA TOTP (3.3),
multi-currency (5.3), tests frontend vitest on taxFr.js (6.2), bank
sync cron (6.3), trademark research on "Wealthly" + Hebrew rebrand
candidates, **PDF screenshots embed** à la Finary annual report
(html2canvas → addImage). See ROADMAP.md.

## Previous session — 2026-05-05

Massive session. Delivered (in order of commits):

1. Tailwind v4 + design tokens setup
2. Dashboard redesign (gold direction abandoned mid-session)
3. Visual propagation across all pages (palette + chrome refinement)
4. Mobile responsive + PWA (manifest, SW, icons)
5. Charges-fixes scroll bug fix + PDF export
6. Tax simulator FR (initial)
7. Custom categorization rules
8. Wealth snapshot history + chart
9. Forgot/reset password flow + Resend
10. Backend pytest + GitHub Actions CI
11. Budget alert badge
12. Onboarding refonte + member palette harmonization
13. Tax simulator overhaul (multi-earner salaries + bonuses + childcare/CESU credits + plafond niches + dropped sharedChildren)
14. Rename Trésorerie → Suivi mensuel
15. Demo mode (seeded household, no signup needed)

User stopped before the découpe of WealthlyApp.jsx — that's the next big chantier.

User reported: forgot-password email didn't arrive in their test. Diagnosed as the Resend free-tier sender restriction; logging improved on the backend so future runs surface the cause clearly in Railway logs.
