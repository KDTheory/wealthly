# Wealthly — Roadmap

État au **2026-05-06 (soir)** — sortie de session "investor-ready" (refonte UI + sécu + features signature + i18n + PDF dark + Finary loan view).

---

## ✅ Fait

### Architecture & code
- [x] **Découpe du monolithe** `WealthlyApp.jsx` : 6 386 → 1 139 lignes (-82 %), répartis en :
  - `src/constants.js`, `src/storage.js`, `src/utils.js`
  - `src/Styles.jsx` (CSS-in-JS isolé)
  - `src/components/` : `Toast`, `AnimatedNumber`, `NetWorthChart`, `HealthScore`
  - `src/hooks/` : `useIsNarrow`
  - `src/views/` : `Dashboard`, `Wealth`, `Monthly`, `Cashflow`, `Budgets`, `Transactions`, `Analysis`, `Settings`, `ImportFlow`, `Onboarding`
- [x] **Code-splitting** : recharts / lucide / jspdf en chunks séparés via Vite `manualChunks`. `TaxSimulator`, `BankCallback` et `pdfReport` chargés en `lazy` / `import()` dynamiques.
- [x] **Memoization** : `AnimatedNumber`, `NetWorthChart`, `SankeyNode` en `React.memo`, `fmt` stabilisé via `useCallback`.

### Visuel & design system
- [x] Direction "encre profonde + or sobre + sage / terracotta sourds" stabilisée (Pictet / Edmond de Rothschild mood).
- [x] **Sidebar gauche persistante** sur desktop (≥ 1024 px), bottom-nav 6 items sur mobile.
- [x] Refonte hero Dashboard : net worth en `clamp(46→84px)` sur sparkline gold, perf pill 1M inline, secondary KPI strip sobre.
- [x] **Polices DM Sans + DM Mono** (variable, single woff2 chacune), tabular-nums sur tous les chiffres.
- [x] Palette refinée : `--bg-page` → `#0a0b0e`, borders en `rgba(255,255,255,0.07/0.12)`, success/danger/warning ré-saturés, nouveaux tokens `--num-positive` / `--num-negative` / `--bg-hover` / `--primary-dim`.
- [x] **Hero card** : strip or 2 px en haut comme signature visuelle exclusive.
- [x] Card titles en eyebrow Linear-style (small caps, 0.14em letter-spacing).
- [x] Empty states refaits en typo statement gauche-aligné.
- [x] Modales : backdrop blur 8 px + slide-in 180 ms cubic-bezier, header sober, footer sur surface secondaire.
- [x] Boutons CTA hauteur fixe (36 / 44 px), radius 8 px.
- [x] Mode dark forcé partout (mode clair retiré, plus de toggle, anti-flash inline dans `<head>`).
- [x] Suppression du parc d'emojis dans le chrome (toasts, status pills, KPI metas) — émojis restent dans le contenu utilisateur (catégories).
- [x] Suppression du composant Confetti (dead code).

### Mobile & PWA
- [x] Bottom-nav 6 items, blur(16px) saturate(180%), safe-area-inset-bottom, label visible.
- [x] Sankey responsive (marges et nodes adaptés < 760 px).
- [x] Anti-jank Recharts : `isAnimationActive: false` global (gros gain iOS Safari).
- [x] Optimistic auth : `auth.me()` ne bloque plus le boot, l'app rentre direct.
- [x] PWA installable (manifest, SW network-first, iOS metas, viewport-fit=cover).

### Features fonctionnelles
- [x] **Score santé financière** (Dashboard) : jauge SVG 270° + 5 critères pondérés (taux épargne 25 / fonds urgence 20 / dette/actif 20 / diversification 20 / budgets 15), couleur rouge → ambre → sage selon le seuil 40 / 70.
- [x] **Filtres transactions avancés** : panel collapsible avec multi-cat (revenus / dépenses groupés, compteurs), multi-comptes, multi-membres (chips colorées), plage de dates, montant min/max, type (revenus / dépenses / tout). Badge or sur le bouton Filtres avec compte de filtres actifs.
- [x] **Hub Mensuel** : Vue mensuelle / Cashflow / Budgets regroupés sous un seul item de nav avec segmented control interne.
- [x] **Export PDF bilan** mensuel (3 pages, jsPDF dynamiquement importé).
- [x] **Simulateur d'impôt FR 2025** : barème, parts, plafond quotient, décote, crédits garde enfants + CESU, plafond niches 10 000 €.
- [x] **Règles de catégorisation custom** (UI dans Réglages, validation regex client-side).
- [x] **Historique patrimoine** : `wealth_snapshots` mensuel auto, courbe avec toggle brut / net / financier + sélecteur de période.
- [x] **Alerte budget** : badge rouge sur la nav avec nombre de budgets dépassés.
- [x] **Mot de passe oublié** : table dédiée (SHA-256, single-use, 60 min), email Resend, écran reset auto-déclenché par `?reset_token=`.
- [x] **Mode démo** : seed client-side (Alice + Bob + Léa, 6 mois de données réalistes).
- [x] **Synchro bancaire DSP2** : intégration GoCardless Bank Account Data, dédup sur `external_id`.
- [x] **Plus-values latentes** sur actifs (`purchase_price` + `purchase_date` via Alembic) : affichage PV € + % dans Patrimoine.
- [x] **Plafonds régulés** : barres de progression PEA / PEA-PME / Livret A / LDDS / LEP avec détection par regex sur le nom + warn à 90 % / over à 99 %.
- [x] **Comparaison N vs N-1** sur Suivi mensuel : sub-label "+12 % vs mai 2025" sous chaque KPI.
- [x] **Drawer compte** : panneau latéral droit au clic sur un compte (sparkline 3 mois + 10 dernières tx + CTA "voir toutes" qui pré-applique le filtre dans Transactions).
- [x] **Vue prêt façon Finary** : refonte complète de `LiabilityDetail` (top bar, KPI strip remboursé/taux/mensualité/restant, onglets Synthèse/Mensualités, BarChart amortissement avec ReferenceLine mensualité, panneau hiérarchique).
- [x] **PDF bilan rebuild** : 5+ pages (cover hero net worth + score santé, Synthèse KPIs + allocation bar, Évolution sparkline + table, Trésorerie, Détail avec PV latente, 1 page d'amortissement par dette avec graphe). **Thème dark** mirror du site (encre profonde + or sobre).
- [x] **i18n FR / EN** : `react-i18next` setup, locales `fr/` `en/`, persistance localStorage, bouton FR · EN inline dans la sidebar utilities + header mobile (sortie de Réglages).
- [x] **AuthScreen polish** : page sortie du noir absolu (radial vignette + glows or), copy honnête (suppression du "Auto-hébergé" trompeur), card surface lifted avec border-top or 2 px.

### Sécurité
- [x] **Rate limiting** sur `/auth/login` (10 req/min IP), `/auth/register` (5 req/min), `/auth/forgot-password` (5 req/min) via slowapi.
- [x] CORS regex pour matcher tous les déploiements Vercel.
- [x] HTTPS partout, mots de passe bcrypt, JWT signé 7 jours.

### Backend & infra
- [x] **Alembic** : infrastructure posée (alembic.ini, env.py, baseline marker), auto-stamp au boot pour la DB existante. Future modifs schémas via revisions.
- [x] Tests pytest (25+ tests : auth, password reset, snapshots, rules, banks).
- [x] CI GitHub Actions sur chaque push + PR.
- [x] Logging structuré email service (Railway logs).

---

## 🔜 À faire

### Sécurité (prio 1)
- [ ] **JWT → httpOnly cookies** : migrer le token hors du `localStorage` (XSS-vulnerable). Setter cookie httpOnly+Secure+SameSite=Lax, middleware lit Bearer header OU cookie pendant la migration, endpoint `/auth/logout` pour clear server-side.
- [ ] **2FA TOTP** : `pyotp` + `qrcode`, table `totp_secrets`, flow login en deux étapes (`requires_totp` + `partial_token`), backup codes, section dédiée dans Réglages.
- [ ] **Vérifier `SECRET_KEY`** sur Railway (rotation périodique).
- [ ] **Journal de connexion** : table `login_events` (IP, UA, timestamp), vue admin.

### Features produit (prio 2)
- [ ] **Tooltips contextuels** sur les KPIs gestion privée.
- [ ] **Étendre i18n** au-delà de la nav + Settings : Dashboard / Wealth / erreurs API / ImportFlow / toasts.

### PDF — itération suivante (prio 2)
- [ ] **Embed de screenshots de la plateforme** dans le bilan PDF (à la Finary annual report) : html2canvas → PNG dataURL → `doc.addImage`. Capturer Dashboard, courbe patrimoine, score santé, allocation Sankey. Page dédiée "Tableau de bord" insérée après la cover.
- [ ] **Cover graphique** : ajouter un graphe sparkline net worth en filigrane derrière le hero, ou un mini donut composition d'actifs.

### Stratégie business (prio 1 hors code)
- [ ] **Trademark check Wealthly** : EUIPO / INPI / USPTO (wealthly.com existe déjà). Décision rebrand → si oui, candidats hébreu : Kéren, Otsar, Segula, Nahala, Yesod.
- [ ] **Multi-currency** : `currency` sur households + `formatMoney(amount, currency, locale)` centralisé + Alembic revision. Utile dès qu'on sort de la France.

### Infra (prio 3)
- [ ] **Tests frontend** : vitest sur `taxFr.js` (couverture rigoureuse du moteur fiscal).
- [ ] **Cron Railway pour sync bancaire** : endpoint `/internal/sync-all-banks` protégé par secret header, déclenché 1×/jour à 6h UTC.
- [ ] **Notif email J-7 expiration consentement DSP2** via Resend.

### Refactoring (prio 4 — quand le besoin se fera sentir)
- [ ] **Découpe data layer** : extraire les hooks `useReload`, `useMembers`, `useAccounts`, `useTransactions`, `useWealth` du shell `WealthlyApp.jsx` (~1100 lignes, encore prop-drillage).
- [ ] **TypeScript** ? À discuter — pour l'instant pas de friction concrète.

---

## 🚫 Hors scope (volontairement)

- ❌ **Rebalancing automatique d'allocation** — refusé.
- ❌ **Garde alternée** dans le simulateur d'impôt — supprimée sur demande.
- ❌ **Mode clair** — supprimé sur demande utilisateur (dark-only).

---

## 📅 Notes des sessions

**2026-05-06 (matin) — Refonte visuelle "investor-ready" + découpe complète**
Audit benchmarking Finary / Monarch / Kubera / Copilot. Diagnostic : direction or-sobre OK mais exécution sous-spec. Sortie : hero dramatique, sidebar desktop, mobile bottom-nav 6 items, palette refinée, fonts DM Sans/Mono, modales modernisées, empty states sober. Découpe `WealthlyApp.jsx` 6 386 → 1 139 lignes (L1 utils/constants/Styles + L2 toutes les vues + leaf components).

**2026-05-06 (après-midi) — Sécu basique + features signature**
Rate limiting auth, alembic infra (auto-stamp baseline), filtres transactions multi-critères avec panel, score santé financière 0-100 avec jauge SVG hand-rolled.

**2026-05-06 (soir) — Features patrimoniales + i18n + PDF dark + bug-bash**
Plus-values latentes, plafonds régulés (PEA/Livret A/LDDS), YoY sur Suivi mensuel, drawer compte avec cross-view filter, refonte LiabilityDetail façon Finary, AuthScreen polish, PDF rebuild en thème dark mirror du site (cover hero + amortissement par dette + sanitize Unicode pour fixer les glyphs `/` et `"` venant de `Intl.NumberFormat`). i18n FR/EN setup avec bouton FR · EN inline (sortie de Réglages). Hotfixes : `WEALTH_SUBVIEWS` résiduel post-sed, SW cache version bump, `formatDate` manquant dans Dashboard (écran noir post-login).

**2026-05-05 — Synchro bancaire DSP2**
Intégration GoCardless Bank Account Data. Tables `bank_connections`, `bank_account_links`. Dédup sur `external_id`.

**Direction visuelle (stabilisée)** : encre profonde + or sobre + sage / terracotta sourds. Tabular-nums partout. Pas de translateY au hover. Or = signature unique sur les CTA et les trends positifs.
