"""
config.py — Configuration centralisée du pipeline.

Toutes les constantes et chemins sont définis ici.
Les autres modules importent depuis ce fichier uniquement.
"""

import os
from pathlib import Path

from dotenv import load_dotenv

# ---------------------------------------------------------------------------
# Chemins
# ---------------------------------------------------------------------------

# Racine du projet (1nCOnseil1000/)
BASE_DIR = Path(__file__).resolve().parent.parent

# Dossier contenant les PDF à ingérer
PDF_DIR = BASE_DIR / "pdf-doc"

# Dossier de sortie des images de pages rendues
# Doit être dans public/ pour être servi directement par Next.js (/pdf-pages/...)
PAGES_DIR = BASE_DIR / "public" / "pdf-pages"

# ---------------------------------------------------------------------------
# Base de données
# ---------------------------------------------------------------------------

# Charger le .env à la racine du projet
load_dotenv(BASE_DIR / ".env", override=True)

DATABASE_URL: str = os.environ.get("DATABASE_URL", "")

if not DATABASE_URL:
    raise EnvironmentError(
        "DATABASE_URL n'est pas défini. "
        "Vérifiez le fichier .env à la racine du projet."
    )

# ---------------------------------------------------------------------------
# Rendu PDF → image
# ---------------------------------------------------------------------------

# Résolution pour le rendu des pages complètes (affichage)
PAGE_DPI: int = 150

# Résolution pour le rendu des zones croppées (extraits visuels)
CROP_DPI: int = 200

# ---------------------------------------------------------------------------
# OCR
# ---------------------------------------------------------------------------

# Code langue Tesseract (fra = français)
OCR_LANG: str = "fra"

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

LOG_LEVEL: str = os.environ.get("LOG_LEVEL", "INFO")
