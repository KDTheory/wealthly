# Wealthly — Suivi de patrimoine familial auto-hébergé

Application complète de gestion de patrimoine : comptes bancaires, immobilier, placements, prêts, budgets, trésorerie mensuelle, et KPIs de gestion privée (taux d'épargne, ratio d'endettement, allocation par classe d'actifs).

**100% auto-hébergé. Vos données restent chez vous.**  
**Catégorisation IA** via Claude Haiku — BYOK (votre propre clé Anthropic, optionnel).

---

## Sommaire

1. [Prérequis](#prérequis)
2. [Installation locale (5 min)](#installation-locale)
3. [Pousser sur GitHub](#pousser-sur-github)
4. [Reprendre le travail sur une autre machine](#reprendre-sur-une-autre-machine)
5. [Commandes quotidiennes](#commandes-quotidiennes)
6. [Activer la catégorisation IA](#activer-la-catégorisation-ia)
7. [Backup et restauration](#backup-et-restauration)
8. [Déployer sur un VPS](#déployer-sur-un-vps)
9. [Architecture](#architecture)
10. [Dépannage](#dépannage)

---

## Prérequis

| Outil | Version minimale | Vérification |
|---|---|---|
| **Python** | 3.11+ | `python --version` |
| **Node.js** | 18+ | `node --version` |
| **npm** | 9+ | `npm --version` |
| **Git** | n'importe | `git --version` |

> **Pas de Docker requis.** Le backend tourne avec uvicorn, le frontend avec Vite. La base de données est SQLite (fichier local, aucune installation).

---

## Installation locale

### 1. Cloner ou décompresser le projet

```bash
git clone https://github.com/ton-username/wealthly.git
cd wealthly
# ou simplement décompresser l'archive dans un dossier
```

### 2. Configurer le backend

```bash
cd backend

# Copier le template de configuration
cp .env.example .env      # Mac/Linux
copy .env.example .env    # Windows

# Édite backend/.env et remplace SECRET_KEY par une vraie clé aléatoire :
#   Mac/Linux : openssl rand -hex 32
#   Windows   : powershell -Command "[Convert]::ToHexString([System.Security.Cryptography.RandomNumberGenerator]::GetBytes(32))"
```

Installer les dépendances Python :

```bash
# Dans le dossier backend/
pip install -r requirements.txt
```

### 3. Lancer le backend

```bash
# Dans backend/
uvicorn app.main:app --reload --port 8000
```

La base SQLite `backend/wealthly.db` est créée automatiquement au premier démarrage.  
API disponible sur : http://localhost:8000  
Swagger (doc interactive) : http://localhost:8000/docs

### 4. Configurer et lancer le frontend

Dans un **nouveau terminal** :

```bash
cd frontend
npm install
npm run dev
```

Frontend disponible sur : http://localhost:3000

### 5. Créer ton compte

Va sur http://localhost:3000 → **Créer un compte** → remplis email, mot de passe, prénom, nom du foyer.

---

## Pousser sur GitHub

### Créer le repo

1. Connecte-toi sur https://github.com → `+` → **New repository**
2. Nom : `wealthly`, cocher **Private** (important), ne pas initialiser avec README
3. Copier l'URL : `https://github.com/ton-username/wealthly.git`

### Premier push

```bash
# Dans le dossier racine du projet
git init
git add .

# Vérification cruciale AVANT le commit :
# git status ne doit PAS lister .env ou backend/.env
# Ces fichiers contiennent ta clé secrète — ne jamais les committer

git commit -m "Initial commit: Wealthly self-hosted"
git remote add origin https://github.com/ton-username/wealthly.git
git branch -M main
git push -u origin main
```

> **Token GitHub** : depuis 2021, le push demande un token d'accès (pas ton mot de passe).  
> Génère-le sur https://github.com/settings/tokens → **Generate new token (classic)** → coche `repo` → copie le token `ghp_...`.  
> Astuce Windows : `git config --global credential.helper manager` pour le mémoriser.

### Mises à jour suivantes

```bash
git add .
git commit -m "Description de ce que j'ai changé"
git push
```

---

## Reprendre sur une autre machine

```bash
# 1. Cloner
git clone https://github.com/ton-username/wealthly.git
cd wealthly

# 2. Recréer backend/.env (non versionné, à refaire sur chaque machine)
cd backend
cp .env.example .env
# Édite .env : même SECRET_KEY que sur l'autre machine pour que les comptes existants fonctionnent
# (ou une nouvelle clé si tu repars de zéro)

# 3. Installer les dépendances
pip install -r requirements.txt
cd ../frontend && npm install

# 4. Si tu as un backup JSON de tes données :
# Lance le backend, crée un compte, puis Réglages → Importer un backup

# 5. Lancer
# Terminal 1 :
cd backend && uvicorn app.main:app --reload --port 8000
# Terminal 2 :
cd frontend && npm run dev
```

---

## Commandes quotidiennes

### Lancer l'app

```bash
# Terminal 1 — backend
cd backend
uvicorn app.main:app --reload --port 8000

# Terminal 2 — frontend
cd frontend
npm run dev
```

Puis ouvrir http://localhost:3000.

### Git — workflow quotidien

```bash
git status                          # voir les changements
git diff                            # détail ligne par ligne
git add .                           # stager tout
git add frontend/src/WealthlyApp.jsx  # stager un fichier précis
git commit -m "feat: ..."           # committer
git push                            # pousser sur GitHub
git pull                            # récupérer depuis GitHub
git log --oneline -10               # historique récent
```

### Branches (pour expérimenter)

```bash
git checkout -b nouvelle-feature    # créer une branche
# ... code, test ...
git push -u origin nouvelle-feature
# Sur GitHub : Pull Request → merge sur main
git checkout main && git pull
```

---

## Activer la catégorisation IA

Wealthly utilise **Claude Haiku** pour catégoriser automatiquement les transactions non reconnues par les règles regex. C'est un modèle rapide et bon marché (~0,001 € pour 100 transactions).

### Obtenir une clé Anthropic

1. Va sur https://console.anthropic.com
2. Crée un compte (nécessite une carte bancaire pour activer les crédits)
3. **API Keys** → **Create Key** → copie la clé `sk-ant-api03-...`

### Activer dans Wealthly

Édite `backend/.env` et décommente la ligne :

```
ANTHROPIC_API_KEY=sk-ant-api03-ta-vraie-cle-ici
```

Redémarre le backend. Lors du prochain import CSV, le badge ✨ apparaîtra sur les transactions catégorisées par l'IA.

**Sans clé** : la catégorisation fonctionne normalement par regex (25 règles intégrées + tes règles personnalisées). Seules les transactions non reconnues restent "Non catégorisé".

---

## Backup et restauration

### Export depuis l'app (recommandé)

**Réglages** → **Exporter (backup JSON)** → fichier `wealthly-backup-YYYY-MM-DD.json`.  
Garde ce fichier en lieu sûr (cloud chiffré, disque externe).

### Restauration

Sur n'importe quelle installation Wealthly : **Réglages** → **Importer un backup** → sélectionner le JSON.

### Backup du fichier SQLite (alternatif)

```bash
# Copier simplement le fichier DB (backend doit être arrêté ou fichier en lecture seule)
cp backend/wealthly.db backend/wealthly-backup-$(date +%Y%m%d).db
```

---

## Déployer sur un VPS

Pour accéder à Wealthly depuis n'importe où (mobile, travail…).

**VPS recommandés** : Hetzner CX22 (4,50€/mois), Scaleway DEV1-S (4€/mois), ou un Raspberry Pi 4 à la maison.

```bash
# 1. Sur le VPS : installer Python et Node
sudo apt update && sudo apt install python3-pip nodejs npm git -y

# 2. Cloner
git clone https://github.com/ton-username/wealthly.git && cd wealthly

# 3. Configurer
cd backend && cp .env.example .env
# Éditer .env : nouvelle SECRET_KEY, CORS_ORIGINS=https://ton-domaine.com

# 4. Installer
pip3 install -r requirements.txt
cd ../frontend && npm install && npm run build

# 5. Lancer le backend en production (avec gunicorn ou en service systemd)
cd ../backend
pip install gunicorn
gunicorn app.main:app -w 2 -k uvicorn.workers.UvicornWorker --bind 0.0.0.0:8000 &

# 6. Servir le frontend buildé avec nginx ou Caddy
# Caddy (le plus simple, HTTPS automatique) :
# Caddyfile : ton-domaine.com { root * /chemin/vers/wealthly/frontend/dist; file_server; reverse_proxy /api/* localhost:8000 }
```

---

## Architecture

```
wealthly/
├── backend/                    FastAPI + SQLAlchemy + SQLite
│   ├── app/
│   │   ├── main.py             Point d'entrée, CORS, montage des routers
│   │   ├── config.py           Variables d'environnement (Pydantic Settings)
│   │   ├── database.py         Moteur SQLAlchemy (SQLite ou Postgres)
│   │   ├── models.py           Tables ORM (11 modèles)
│   │   ├── auth.py             JWT (python-jose + passlib bcrypt)
│   │   ├── schemas.py          Schémas Pydantic (validation I/O)
│   │   ├── defaults.py         Catégories par défaut à la création du foyer
│   │   └── routers/
│   │       ├── auth.py         POST /auth/register, /auth/login, /auth/me
│   │       ├── accounts.py     CRUD comptes bancaires
│   │       ├── transactions.py CRUD + import bulk CSV
│   │       ├── wealth.py       CRUD actifs + passifs
│   │       ├── other.py        Catégories, budgets, objectifs, règles, succès
│   │       ├── categorize.py   POST /categorize — regex + Claude Haiku
│   │       └── members.py      CRUD membres du foyer
│   ├── requirements.txt
│   ├── .env.example            Template de config (à copier en .env)
│   └── wealthly.db             Base SQLite (dans .gitignore)
│
├── frontend/                   React 18 + Vite + Recharts
│   ├── src/
│   │   ├── WealthlyApp.jsx     Toute l'app (~4000 lignes)
│   │   ├── AuthScreen.jsx      Écran login / inscription
│   │   ├── api.js              Client HTTP (JWT, fetch wrapper)
│   │   └── main.jsx            Entrée React
│   ├── vite.config.js          Proxy /api → localhost:8000
│   └── package.json
│
├── .gitignore
├── .env.example                (obsolète, voir backend/.env.example)
├── README.md                   Ce fichier
└── ROADMAP.md                  Prochaines étapes et idées
```

**Flux de données** :  
`Navigateur → Vite dev server (port 3000) → proxy /api/* → FastAPI (port 8000) → SQLite`

**Auth** : JWT stocké dans `localStorage` sous la clé `wealthly:token`. Expire selon `ACCESS_TOKEN_EXPIRE_MINUTES`.

**Catégorisation** : 3 passes — règles regex intégrées (25) → règles custom du foyer → Claude Haiku (si clé dispo) → "non catégorisé".

---

## Dépannage

### "Impossible de joindre le serveur"
Le backend n'est pas lancé. Ouvre un terminal, `cd backend`, `uvicorn app.main:app --reload --port 8000`.

### "Module not found" au démarrage du backend
```bash
cd backend && pip install -r requirements.txt
```

### Page blanche sur le frontend
Ouvre la console (F12). Si erreur 401 → session expirée, recharge et reconnecte-toi. Si erreur réseau → backend arrêté.

### Port 3000 déjà occupé
```bash
# Windows
netstat -ano | findstr :3000   # trouve le PID
taskkill /PID <pid> /F
```

### Réinitialiser complètement
```bash
rm backend/wealthly.db   # supprime la base
# Relancer le backend recrée une base vide
```

### Mettre à jour après un `git pull`
```bash
# Backend : si requirements.txt a changé
pip install -r backend/requirements.txt
# Frontend : si package.json a changé
cd frontend && npm install
```
