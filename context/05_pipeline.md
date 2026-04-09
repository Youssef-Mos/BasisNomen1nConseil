# Python Pipeline

## Rôle
Le pipeline Python gère toutes les opérations sur les fichiers PDF qui ne peuvent pas être faites en JS :
- Rendu des pages en PNG
- Crop d'une zone rectangulaire
- Extraction de texte par zone (OCR)

## Scripts

### `python-pipeline/render_pages.py`
**Déclenché** : au moment de l'upload d'un PDF.
**Arguments** : `pdfAbsPath outputDir`
**Sortie** : `public/pdf-pages/{docId}/page-1.png`, `page-2.png`, ...
**Timeout** : 5 minutes (grands PDFs)

### `python-pipeline/crop_rectangle.py`
**Déclenché** : après création ou mise à jour géométrique d'un rectangle.
**Arguments** : `pdfAbsPath page x y width height outputPath`
- `page` : 1-indexé
- `x y width height` : pourcentages 0–100
**Sortie** : `public/pdf-pages/{docId}/crops/{rectId}.png`
**Timeout** : 30 secondes

### `python-pipeline/extract_text_zone.py`
**Déclenché** : lors d'un PUT rectangle si la géométrie a changé (et textFr non fourni explicitement).
**Arguments** : `pdfAbsPath page x y width height`
**Sortie** : JSON stdout `{"text": "..."}` ou `{"text": null}`
**Timeout** : 15 secondes, maxBuffer 2MB

## Dépendances Python
```
pytesseract    → OCR
Pillow         → traitement image
PyMuPDF (fitz) → lecture PDF
python-dotenv  → (optionnel)
```

## Setup
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
brew install tesseract   # Mac
```

## Intégration Next.js
- Appelé via `child_process.execFile` + `promisify`
- Appelé de façon **synchrone** (await) avant le retour de la réponse API
  - render_pages : bloquant à l'upload (l'admin voit les pages dès l'ouverture de l'éditeur)
  - crop : bloquant au save (le crop est dispo immédiatement dans l'UI)
- Les erreurs sont loggées mais **ne bloquent pas** la réponse (try/catch silencieux)

## Stockage statique
- Pages et crops servis statiquement via `public/pdf-pages/`
- `public/pdf-pages/` exclu du git
- Protection anti-hotlinking sur `/api/crop/:rectId` (vérification Referer)
