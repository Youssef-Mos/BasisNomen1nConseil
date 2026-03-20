"""
pipeline_single.py — Pipeline d'ingestion pour un seul fichier PDF.

Usage :
    python pipeline_single.py --file <chemin_absolu_du_pdf>

Émet des événements JSON ligne par ligne sur stdout pour permettre
au serveur Next.js de suivre la progression en temps réel :

    {"event": "step_start",  "step": "<step_id>", "label": "..."}
    {"event": "step_end",    "step": "<step_id>", "label": "..."}
    {"event": "error",       "step": "<step_id>", "message": "..."}
    {"event": "complete",    "document_id": "..."}
"""

import argparse
import hashlib
import json
import sys
from pathlib import Path

# ---------------------------------------------------------------------------
# Helpers d'émission d'événements
# ---------------------------------------------------------------------------

def emit(event: dict) -> None:
    """Émet un événement JSON sur stdout et vide le buffer immédiatement."""
    print(json.dumps(event, ensure_ascii=False), flush=True)


def emit_step_start(step: str, label: str) -> None:
    emit({"event": "step_start", "step": step, "label": label})


def emit_step_end(step: str, label: str) -> None:
    emit({"event": "step_end", "step": step, "label": label})


def emit_error(step: str, message: str) -> None:
    emit({"event": "error", "step": step, "message": message})


def emit_complete(document_id: str) -> None:
    emit({"event": "complete", "document_id": document_id})


# ---------------------------------------------------------------------------
# Calcul SHA-256
# ---------------------------------------------------------------------------

def compute_sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65_536), b""):
            h.update(chunk)
    return h.hexdigest()


# ---------------------------------------------------------------------------
# Pipeline complet pour un fichier
# ---------------------------------------------------------------------------

STEPS = [
    ("init",              "Initialisation…"),
    ("create_document",   "Enregistrement du PDF…"),
    ("extract_pages",     "Extraction des pages…"),
    ("extract_structure", "Analyse de la structure…"),
    ("detect_articles",   "Détection des articles…"),
    ("build_hierarchy",   "Construction de la hiérarchie…"),
    ("extract_zones",     "Extraction des zones visuelles…"),
    ("run_ocr",           "Extraction OCR…"),
    ("finalize",          "Finalisation…"),
]


def run_pipeline(pdf_path: Path) -> None:
    """Exécute le pipeline complet pour un PDF unique."""
    from config import LOG_LEVEL
    from db import get_connection, transaction, file_hash_exists
    from steps import (
        build_hierarchy,
        create_document,
        detect_articles,
        extract_pages,
        extract_structure,
        extract_zones,
        run_ocr,
    )

    import logging
    logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))

    # --- Étape : initialisation ---
    step_id, step_label = STEPS[0]
    emit_step_start(step_id, step_label)
    try:
        if not pdf_path.exists():
            raise FileNotFoundError(f"Fichier introuvable : {pdf_path}")
        file_hash = compute_sha256(pdf_path)
        title = pdf_path.stem
        emit_step_end(step_id, step_label)
    except Exception as exc:
        emit_error(step_id, str(exc))
        sys.exit(1)

    # Vérification doublon avant de commencer la transaction
    conn_check = get_connection()
    try:
        if file_hash_exists(conn_check, file_hash):
            emit_error("init", "Ce PDF a déjà été ingéré (doublon détecté).")
            sys.exit(1)
    finally:
        conn_check.close()

    ctx: dict = {
        "path":      pdf_path,
        "file_hash": file_hash,
        "title":     title,
    }

    # Correspondance step_id → module
    pipeline_steps = [
        ("create_document",   create_document,   STEPS[1][1]),
        ("extract_pages",     extract_pages,     STEPS[2][1]),
        ("extract_structure", extract_structure, STEPS[3][1]),
        ("detect_articles",   detect_articles,   STEPS[4][1]),
        ("build_hierarchy",   build_hierarchy,   STEPS[5][1]),
        ("extract_zones",     extract_zones,     STEPS[6][1]),
        ("run_ocr",           run_ocr,           STEPS[7][1]),
    ]

    try:
        with transaction() as conn:
            for step_id, module, label in pipeline_steps:
                emit_step_start(step_id, label)
                try:
                    ctx = module.run(ctx, conn)
                    emit_step_end(step_id, label)
                except Exception as exc:
                    emit_error(step_id, str(exc))
                    raise
    except Exception:
        sys.exit(1)

    # --- Étape : finalisation ---
    step_id, step_label = STEPS[8]
    emit_step_start(step_id, step_label)
    emit_step_end(step_id, step_label)

    emit_complete(ctx.get("document_id", ""))


# ---------------------------------------------------------------------------
# Point d'entrée
# ---------------------------------------------------------------------------

def main() -> None:
    parser = argparse.ArgumentParser(
        description="Pipeline d'ingestion PDF (fichier unique)"
    )
    parser.add_argument(
        "--file",
        required=True,
        help="Chemin absolu vers le fichier PDF à ingérer.",
    )
    args = parser.parse_args()

    pdf_path = Path(args.file).resolve()
    run_pipeline(pdf_path)


if __name__ == "__main__":
    main()
