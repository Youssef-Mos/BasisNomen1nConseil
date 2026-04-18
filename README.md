# Basis Norm Explorer

Application web d'annotation et d'exploration de documents PDF réglementaires structurés.

- **Admin** (`/admin`) : upload de PDFs, dessin de rectangles, annotation de contenu
- **Explore** (`/explore`) : consultation du contenu annoté

## Stack

| Couche | Technologie |
|--------|-------------|
| Frontend / Backend | Next.js 16 (App Router) + TypeScript |
| Styles | Tailwind CSS v4 |
| Base de données | PostgreSQL 14+ via Prisma 6 |
| Pipeline Python | PyMuPDF (extraction texte), Pillow, pytesseract |

---

## Installation

### Étape 1 — Prérequis système

Installer Node.js 20+, PostgreSQL 14+ et Python 3.10+.

#### Ubuntu 24.04

```bash
# Node.js
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# PostgreSQL
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql

# Python (inclus par défaut, ajouter uniquement ces paquets)
sudo apt install -y python3-venv python3-pip tesseract-ocr
```

Créer la base de données :

```bash
sudo -u postgres psql <<'SQL'
CREATE USER basis_user WITH PASSWORD 'basis_pass';
CREATE DATABASE basis_norm_explorer OWNER basis_user;
GRANT ALL PRIVILEGES ON DATABASE basis_norm_explorer TO basis_user;
SQL
```

#### Windows 10/11

1. **Node.js** : télécharger et installer depuis [nodejs.org](https://nodejs.org) (LTS 20+)
2. **PostgreSQL** : télécharger et installer depuis [postgresql.org](https://www.postgresql.org/download/windows/) — noter le mot de passe `postgres` choisi à l'installation
3. **Python** : télécharger et installer depuis [python.org](https://www.python.org/downloads/) — cocher *"Add Python to PATH"* lors de l'installation
4. **Tesseract** : télécharger et installer depuis [github.com/UB-Mannheim/tesseract](https://github.com/UB-Mannheim/tesseract/wiki)

Créer la base de données (dans pgAdmin ou PowerShell) :

```sql
CREATE USER basis_user WITH PASSWORD 'basis_pass';
CREATE DATABASE basis_norm_explorer OWNER basis_user;
GRANT ALL PRIVILEGES ON DATABASE basis_norm_explorer TO basis_user;
```

---

### Étape 2 — Cloner le dépôt

```bash
git clone <url-du-repo>
cd BasisNomen1nConseil
```

---

### Étape 3 — Configurer l'environnement

Copier le fichier d'exemple et remplir les valeurs :

```bash
# Linux/Mac
cp .env.example .env

# Windows (PowerShell)
copy .env.example .env
```

Contenu minimal de `.env` :

```env
DATABASE_URL="postgresql://basis_user:basis_pass@localhost:5432/basis_norm_explorer"

ADMIN_EMAIL=votre@email.com
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=votre@email.com
SMTP_PASS=mot-de-passe-smtp
SMTP_FROM=noreply@example.com
ADMIN_SESSION_SECRET=<générer ci-dessous>
```

Générer `ADMIN_SESSION_SECRET` (après `npm install`) :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

### Étape 4 — Installer les dépendances Node

```bash
npm install
```

---

### Étape 5 — Initialiser la base de données

```bash
npx prisma generate
npx prisma migrate deploy
```

> `migrate deploy` applique les migrations existantes sans en créer de nouvelles.
> C'est la commande correcte pour une installation fraîche.

---

### Étape 6 — Configurer le pipeline Python

```bash
# Linux/Mac
python3 -m venv .venv
.venv/bin/pip install -r python-pipeline/requirements.txt

# Windows (PowerShell)
python -m venv .venv
.venv\Scripts\pip install -r python-pipeline\requirements.txt
```

> Le venv doit être dans `.venv/` à la racine du projet.
> L'application le détecte automatiquement — inutile de l'activer manuellement.

---

### Étape 7 — Lancer l'application

```bash
npm run dev
```

L'application est disponible sur **http://localhost:3000**.

---

## Structure du projet

```
BasisNomen1nConseil/
├── app/                    # Next.js App Router (pages + API routes)
│   ├── admin/              # Interface d'annotation (protégée par OTP)
│   ├── explore/            # Interface de consultation publique
│   └── api/                # Routes API REST
├── components/             # Composants React
│   ├── admin/              # Éditeur PDF, panneau propriétés, barre d'outils
│   └── explore/            # Visionneuse, filtres, résultats
├── lib/                    # Utilitaires partagés (prisma, types, python)
├── prisma/                 # Schéma + migrations Prisma
│   ├── schema.prisma
│   └── migrations/
├── python-pipeline/        # Scripts Python (extraction texte, rendu pages)
│   ├── extract_text_zone.py
│   ├── render_pages.py
│   └── requirements.txt
├── uploads/                # PDFs uploadés (créé automatiquement, non versionné)
└── public/pdf-pages/       # Pages PDF rendues en images (créé automatiquement)
```

---

## Commandes utiles

```bash
npm run dev                                      # Lancer en développement
npx tsc --noEmit                                 # Vérifier TypeScript
npx prisma studio                                # Interface graphique base de données
npx prisma migrate dev --name nom_migration      # Créer une nouvelle migration (dev)
npx prisma generate                              # Régénérer le client Prisma
```

---

## Dépannage

### `prisma migrate deploy` échoue — "database does not exist"
Vérifier que la base existe et que `DATABASE_URL` est correct.
```bash
# Linux
sudo -u postgres psql -c "\l"
```

### `prisma generate` échoue — erreur OpenSSL (Linux)
```bash
sudo apt install -y openssl libssl-dev
```

### Extraction de texte échoue — "PyMuPDF not installed"
Le venv Python n'est pas correctement configuré. Refaire l'étape 6 :
```bash
# Linux/Mac
rm -rf .venv && python3 -m venv .venv
.venv/bin/pip install -r python-pipeline/requirements.txt
.venv/bin/python3 -c "import fitz; print('OK')"   # doit afficher OK
```

### Les pages PDF ne s'affichent pas après upload
Vérifier les logs du serveur (`npm run dev`) pour des erreurs Python.
`render_pages.py` s'exécute lors de chaque upload et nécessite PyMuPDF.
