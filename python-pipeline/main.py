"""
main.py — Orchestrateur du pipeline d'ingestion PDF.

Flux complet pour chaque PDF :
    1. scan_folder      — scan /pdf-doc, SHA-256, filtre anti-doublons
    2. create_document  — INSERT documents
    3. extract_pages    — rendu PNG de chaque page
    4. extract_structure— extraction des blocs texte (PyMuPDF)
    5. detect_articles  — regex + heuristiques → titres candidats
    6. build_hierarchy  — arbre parent/enfant + INSERT articles
    7. extract_zones    — zones visuelles + crops + INSERT pdf_zones
    8. run_ocr          — texte natif ou Tesseract  + INSERT ocr_texts

Chaque PDF est traité dans une transaction PostgreSQL isolée.
Un échec sur un PDF déclenche un rollback et n'interrompt pas les suivants.
"""

import logging
import sys

from config import LOG_LEVEL
from db import get_connection, transaction
from steps import (
    build_hierarchy,
    create_document,
    detect_articles,
    extract_pages,
    extract_structure,
    extract_zones,
    run_ocr,
    scan_folder,
)

# ---------------------------------------------------------------------------
# Logging
# ---------------------------------------------------------------------------

logging.basicConfig(
    level=getattr(logging, LOG_LEVEL, logging.INFO),
    format="%(asctime)s [%(levelname)-8s] %(name)s — %(message)s",
    datefmt="%H:%M:%S",
    handlers=[logging.StreamHandler(sys.stdout)],
)

logger = logging.getLogger("pipeline")

_SEP = "─" * 60


# ---------------------------------------------------------------------------
# Pipeline par PDF
# ---------------------------------------------------------------------------

def process_pdf(pdf_info: dict) -> bool:
    """
    Exécute le pipeline complet pour un PDF dans une transaction unique.
    Retourne True en cas de succès, False en cas d'erreur (avec rollback).
    """
    logger.info(_SEP)
    logger.info(f"Traitement  : {pdf_info['path'].name}")
    logger.info(f"Hash SHA-256: {pdf_info['file_hash']}")
    logger.info(_SEP)

    ctx: dict = {
        "path":      pdf_info["path"],
        "file_hash": pdf_info["file_hash"],
        "title":     pdf_info["title"],
    }

    try:
        with transaction() as conn:
            ctx = create_document.run(ctx, conn)       # → document_id
            ctx = extract_pages.run(ctx, conn)         # → page_images, page_count, page_size
            ctx = extract_structure.run(ctx, conn)     # → text_blocks
            ctx = detect_articles.run(ctx, conn)       # → detected_articles
            ctx = build_hierarchy.run(ctx, conn)       # → articles_db
            ctx = extract_zones.run(ctx, conn)         # → zones_db
            ctx = run_ocr.run(ctx, conn)               # → ocr_count

        logger.info(
            f"[OK] {pdf_info['path'].name} — "
            f"{ctx.get('page_count', 0)} pages, "
            f"{len(ctx.get('articles_db', []))} articles, "
            f"{len(ctx.get('zones_db', []))} zones, "
            f"{ctx.get('ocr_count', 0)} OCR"
        )
        return True

    except Exception as exc:
        logger.error(
            f"[FAIL] {pdf_info['path'].name} : {exc}",
            exc_info=True,
        )
        return False


# ---------------------------------------------------------------------------
# Entrée principale
# ---------------------------------------------------------------------------

def main() -> None:
    logger.info("=" * 60)
    logger.info("  Basis Norm Explorer — Pipeline d'ingestion PDF")
    logger.info("=" * 60)

    # Connexion dédiée au scan (lecture seule)
    conn = get_connection()
    try:
        new_pdfs = scan_folder.scan(conn)
    finally:
        conn.close()

    if not new_pdfs:
        logger.info("Aucun nouveau PDF à traiter. Pipeline terminé.")
        return

    logger.info(f"\n{len(new_pdfs)} nouveau(x) PDF(s) à ingérer.\n")

    success: list[str] = []
    failed:  list[str] = []

    for pdf_info in new_pdfs:
        if process_pdf(pdf_info):
            success.append(pdf_info["path"].name)
        else:
            failed.append(pdf_info["path"].name)

    logger.info("\n" + "=" * 60)
    logger.info(f"  RÉSUMÉ : {len(success)} réussi(s)  /  {len(failed)} échoué(s)")
    if failed:
        for name in failed:
            logger.warning(f"    ✗  {name}")
    logger.info("=" * 60)


if __name__ == "__main__":
    main()
