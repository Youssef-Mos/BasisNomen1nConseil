"""
steps/scan_folder.py — Étape 1 : scan du dossier /pdf-doc.

Responsabilités :
- Lister les fichiers .pdf présents dans PDF_DIR
- Calculer le SHA-256 de chaque fichier
- Comparer avec les documents déjà en base
- Retourner uniquement les PDF non encore ingérés

Aucune écriture en base dans cette étape.
"""

import hashlib
import logging
from pathlib import Path

from config import PDF_DIR
from db import file_hash_exists

logger = logging.getLogger(__name__)


def compute_sha256(path: Path) -> str:
    """
    Calcule le hash SHA-256 d'un fichier en le lisant par blocs.
    Evite de charger le fichier entier en mémoire.
    """
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65_536), b""):
            h.update(chunk)
    return h.hexdigest()


def scan(conn) -> list[dict]:
    """
    Scanne PDF_DIR et retourne la liste des PDF à ingérer.

    Chaque entrée retournée est un dict :
        {
            "path":      Path,   # chemin absolu du fichier
            "file_hash": str,    # SHA-256 du fichier
            "title":     str,    # nom du fichier sans extension
        }

    Les PDF dont le fileHash existe déjà en base sont ignorés.
    """
    if not PDF_DIR.exists():
        logger.warning(f"Dossier PDF introuvable : {PDF_DIR}")
        return []

    pdf_files = sorted(PDF_DIR.glob("*.pdf"))

    if not pdf_files:
        logger.info("Aucun fichier PDF trouvé dans %s", PDF_DIR)
        return []

    logger.info(f"{len(pdf_files)} fichier(s) PDF détecté(s) dans {PDF_DIR}")

    new_pdfs: list[dict] = []

    for pdf_path in pdf_files:
        file_hash = compute_sha256(pdf_path)

        if file_hash_exists(conn, file_hash):
            logger.info(f"  [SKIP] Déjà ingéré : {pdf_path.name}")
            continue

        logger.info(f"  [NEW]  À traiter : {pdf_path.name}")
        new_pdfs.append(
            {
                "path": pdf_path,
                "file_hash": file_hash,
                "title": pdf_path.stem,  # ex. "normes2025"
            }
        )

    return new_pdfs
