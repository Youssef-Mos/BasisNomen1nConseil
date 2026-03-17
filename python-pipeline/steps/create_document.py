"""
steps/create_document.py — Étape 2 : insertion du Document en base.

Responsabilités :
- Insérer un enregistrement dans la table `documents`
- Stocker le chemin relatif du PDF (depuis la racine projet)
- Enrichir le contexte avec document_id

Note : le titre est extrait du nom de fichier à ce stade.
Les étapes suivantes pourront l'affiner avec les métadonnées du PDF.
"""

import logging
import uuid
from datetime import datetime, timezone

from config import BASE_DIR

logger = logging.getLogger(__name__)


def run(ctx: dict, conn) -> dict:
    """
    Insère un Document en base et enrichit ctx avec 'document_id'.

    Entrée ctx attendue :
        path       : Path  — chemin absolu du PDF
        file_hash  : str   — SHA-256 du fichier
        title      : str   — titre initial (nom de fichier)

    Sortie ctx ajoutée :
        document_id : str  — ID du document inséré
    """
    document_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc)

    # Stocker le chemin relatif depuis la racine du projet
    # ex. "pdf-doc/normes2025.pdf"
    pdf_path = ctx["path"]
    try:
        relative_path = str(pdf_path.relative_to(BASE_DIR))
    except ValueError:
        # Fallback si le fichier n'est pas sous BASE_DIR
        relative_path = str(pdf_path)

    with conn.cursor() as cur:
        cur.execute(
            """
            INSERT INTO documents
                (id, title, "pdfPath", "fileHash", language, "createdAt", "updatedAt")
            VALUES
                (%s, %s, %s, %s, %s, %s, %s)
            """,
            (
                document_id,
                ctx["title"],
                relative_path,
                ctx["file_hash"],
                "fr",
                now,
                now,
            ),
        )

    ctx["document_id"] = document_id
    logger.info(f'  [DB] Document inséré : id={document_id} title="{ctx["title"]}"')

    return ctx
