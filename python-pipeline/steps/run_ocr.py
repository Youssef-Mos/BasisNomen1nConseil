"""
steps/run_ocr.py — Étape 8 : extraction OCR + INSERT ocr_texts.

Pour chaque zone :
1. Tente d'extraire le texte natif via PyMuPDF (PDF avec couche texte).
2. Si le PDF est scanné (texte vide), applique pytesseract sur l'image croppée.
3. INSERT dans la table `ocr_texts`.

IMPORTANT — usage du texte OCR :
    Le texte stocké ici sert UNIQUEMENT à :
    - la recherche full-text
    - le filtrage
    - le surlignage

    Il ne doit jamais remplacer l'affichage visuel du PDF (imagePath).

Entrée ctx attendue :
    zones_db : list[dict]
    path     : Path

Sortie ctx ajoutée :
    ocr_count : int — nombre de zones avec texte indexé
"""

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import fitz
import pytesseract
from PIL import Image

from config import BASE_DIR, OCR_LANG

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Extraction texte natif
# ---------------------------------------------------------------------------

def _native_text(
    pdf_path: str,
    page_num: int,
    x: float,
    y: float,
    width: float,
    height: float,
) -> str | None:
    """
    Extrait le texte natif de la zone dans le PDF via PyMuPDF.
    Retourne None si la zone est vide (PDF scanné sans couche texte).
    """
    try:
        doc  = fitz.open(pdf_path)
        rect = fitz.Rect(x, y, x + width, y + height)
        text = doc[page_num - 1].get_text("text", clip=rect).strip()
        doc.close()
        return text or None
    except Exception as exc:
        logger.debug(f"    Texte natif indisponible : {exc}")
        return None


# ---------------------------------------------------------------------------
# OCR via Tesseract
# ---------------------------------------------------------------------------

def _tesseract(image_path: Path) -> str | None:
    """
    Lance pytesseract sur l'image et retourne le texte brut.
    Retourne None si l'image est introuvable ou si l'OCR échoue.
    """
    if not image_path.exists():
        return None
    try:
        return pytesseract.image_to_string(Image.open(image_path), lang=OCR_LANG).strip() or None
    except Exception as exc:
        logger.warning(f"    Tesseract échoué : {exc}")
        return None


# ---------------------------------------------------------------------------
# Step principal
# ---------------------------------------------------------------------------

def run(ctx: dict, conn) -> dict:
    zones    = ctx["zones_db"]
    pdf_path = str(ctx["path"])
    now      = datetime.now(timezone.utc)
    count    = 0

    with conn.cursor() as cur:
        for zone in zones:
            # Tentative 1 : texte natif du PDF
            text = _native_text(
                pdf_path,
                zone["page"],
                zone["x"], zone["y"],
                zone["width"], zone["height"],
            )

            # Tentative 2 : Tesseract sur le crop sauvegardé
            if not text and zone.get("image_path"):
                text = _tesseract(BASE_DIR / zone["image_path"])

            if not text:
                logger.debug(f"    Aucun texte pour zone {zone['zone_id']}")
                continue

            cur.execute(
                """
                INSERT INTO ocr_texts
                    (id, "zoneId", text, "createdAt", "updatedAt")
                VALUES
                    (%s, %s, %s, %s, %s)
                """,
                (str(uuid.uuid4()), zone["zone_id"], text, now, now),
            )
            count += 1

    ctx["ocr_count"] = count
    logger.info(f"  [OCR]  {count} zone(s) indexée(s)")
    return ctx
