# Basis Norm Explorer

Base technique Next.js pour une application d'exploration de documents PDF reglementaires structures.

## Stack

- Next.js (App Router) + TypeScript
- Tailwind CSS
- PostgreSQL + Prisma
- next-intl
- Zod

## Prerequis

- Node.js 20+
- PostgreSQL 14+

## Installation

```bash
npm install
```

## Configuration environnement

Le fichier `.env` est preconfigure avec une URL locale par defaut:

```env
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/basis_norm_explorer?schema=public"
```
## Traitement OCR (Python)

Cette partie permet d’extraire automatiquement le texte des PDF réglementaires et de générer les données utilisées par l’application.
Dépendances
Le script Python repose sur les librairies suivantes :
pytesseract (OCR)
Pillow (traitement d’image)
PyMuPDF (lecture PDF)
python-dotenv (optionnel)

Installation

```
python3 -m venv venv
source venv/bin/activate   # Mac / Linux
# ou
venv\Scripts\activate      # Windows
```

Installer les dépendances :

```
pip install -r requirements.txt
```

## Installation de Tesseract

```
Mac : brew install tesseract
Linux : sudo apt install tesseract-ocr
Windows :
https://github.com/tesseract-ocr/tesseract
```

Lancer le script OCR :

```
python script_ocr.py
```





Adaptez-la a votre instance PostgreSQL.

## Prisma

Generer le client Prisma:

```bash
npm run prisma:generate
```

Creer la premiere migration:

```bash
npm run prisma:migrate -- --name init
```

Ouvrir Prisma Studio:

```bash
npm run prisma:studio
```

## Developpement

```bash
npm run dev
```

Application disponible sur http://localhost:3000.
