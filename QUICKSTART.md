# Wealthly — Quickstart

Pour ceux qui veulent juste lancer l'app rapidement. Pour le guide complet, voir [README.md](./README.md).

## En 5 commandes

```bash
# 1. Se placer dans le dossier
cd wealthly

# 2. Créer le fichier .env
cp .env.example .env

# 3. Générer une clé secrète (Mac/Linux)
openssl rand -hex 32
# Copie le résultat dans .env, à la place de SECRET_KEY=...

# 4. Lancer
docker compose up -d

# 5. Ouvrir
open http://localhost:3000      # Mac
# ou : start http://localhost:3000   # Windows
# ou : xdg-open http://localhost:3000   # Linux
```

Premier lancement = 3 à 5 minutes (téléchargement images + build).

## Première utilisation

1. Va sur http://localhost:3000
2. Clique **"Créer un compte"**
3. Remplis : email, mot de passe (8+ caractères), prénom, nom du foyer
4. Tu es loggé. Ajoute des membres, importe un CSV, c'est parti.

## Tout casser et recommencer

```bash
docker compose down -v   # ⚠️ efface aussi les données
docker compose up -d --build
```

## Stop / Start

```bash
docker compose stop      # met en pause (garde les données)
docker compose start     # relance
docker compose down      # arrête + supprime les containers (garde le volume DB)
docker compose up -d     # relance après down
```

## Logs

```bash
docker compose logs -f             # tout en direct
docker compose logs -f backend     # juste le backend
```

## Mise à jour du code

```bash
git pull
docker compose up -d --build
```
