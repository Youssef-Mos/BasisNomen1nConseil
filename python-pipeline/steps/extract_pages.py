"""
steps/extract_pages.py — Étape 3 : rendu des pages PDF en images PNG.

Responsabilités :
- Ouvrir le PDF avec PyMuPDF (fitz)
- Rendre chaque page en image PNG à PAGE_DPI
- Sauvegarder dans PAGES_DIR / {document_id} / page-001.png …
- Enrichir ctx avec page_images, page_count et page_size

Entrée ctx attendue :
    path        : Path — chemin absolu du PDF
    document_id : str  — ID du document en base

Sortie ctx ajoutée :
    page_images : dict[int, str]  — {page_num: chemin_relatif}
    page_count  : int
    page_size   : dict            — {width, height} en PDF points (page 1)
"""

import logging
from pathlib import Path

import fitz  # PyMuPDF

from config import BASE_DIR, PAGE_DPI, PAGES_DIR

logger = logging.getLogger(__name__)


def run(ctx: dict, conn) -> dict:
    pdf_path    = ctx["path"]
    document_id = ctx["document_id"]

    output_dir = PAGES_DIR / document_id
    output_dir.mkdir(parents=True, exist_ok=True)

    doc = fitz.open(str(pdf_path))
    page_images: dict[int, str] = {}

    # Matrice de rendu : scale = DPI / 72  (72 DPI est la base interne de fitz)
    scale = PAGE_DPI / 72.0
    mat   = fitz.Matrix(scale, scale)

    try:
        for page_index in range(len(doc)):
            page_num = page_index + 1  # 1-based

            pix = doc[page_index].get_pixmap(matrix=mat, alpha=False)

            image_path = output_dir / f"page-{page_num:03d}.png"
            pix.save(str(image_path))

            # Stocker le chemin relatif depuis public/ (servi par Next.js comme URL statique)
            page_images[page_num] = str(image_path.relative_to(BASE_DIR / "public"))

        first_page = doc[0]
        ctx["page_size"] = {
            "width":  first_page.rect.width,
            "height": first_page.rect.height,
        }
    finally:
        doc.close()

    ctx["page_images"] = page_images
    ctx["page_count"]  = len(page_images)

    logger.info(f"  [PAGES] {len(page_images)} page(s) rendue(s) → {output_dir}")
    return ctx
