"""
steps/extract_zones.py — Étape 7 : zones visuelles + crops PDF.

Pour chaque article en base :
- Calcule le rectangle de la zone (du titre jusqu'au prochain article ou bas de page)
- Rend le crop depuis le PDF à CROP_DPI
- Sauvegarde l'image dans pdf-pages/{documentId}/crops/{zoneId}.png
- INSERT dans la table `pdf_zones`

Les coordonnées (x, y, width, height) sont en PDF points (72 DPI).
L'image croppée est le rendu visuel qui sera affiché dans l'interface.

Entrée ctx attendue :
    articles_db : list[dict]
    document_id : str
    path        : Path
    page_size   : dict  {width, height}

Sortie ctx ajoutée :
    zones_db : list[dict]
        zone_id    : str
        article_id : str
        page       : int
        x, y, width, height : float
        image_path : str
"""

import logging
import uuid
from datetime import datetime, timezone
from pathlib import Path

import fitz

from config import BASE_DIR, CROP_DPI, PAGES_DIR

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Calcul du rectangle de zone
# ---------------------------------------------------------------------------

def _zone_rect(
    article: dict,
    next_article: dict | None,
    page_width: float,
    page_height: float,
) -> tuple[float, float, float, float]:
    """
    Retourne (x, y, width, height) en PDF points pour la zone d'un article.

    La zone occupe toute la largeur de la page.
    Verticalement, elle part du haut du titre et descend jusqu'à :
    - le haut du prochain titre (si même page)
    - le bas de la page (sinon)
    """
    _x0, y0, _x1, _y1 = article["bbox"]

    if next_article and next_article["page"] == article["page"]:
        bottom = next_article["bbox"][1]
    else:
        bottom = page_height

    return 0.0, y0, page_width, max(bottom - y0, 5.0)


# ---------------------------------------------------------------------------
# Rendu du crop
# ---------------------------------------------------------------------------

def _render_crop(
    pdf_path: str,
    page_num: int,
    x: float,
    y: float,
    width: float,
    height: float,
    output_path: Path,
) -> None:
    """Ouvre le PDF, rend le rectangle demandé et sauvegarde le PNG."""
    scale = CROP_DPI / 72.0
    mat   = fitz.Matrix(scale, scale)
    clip  = fitz.Rect(x, y, x + width, y + height)

    doc  = fitz.open(pdf_path)
    pix  = doc[page_num - 1].get_pixmap(matrix=mat, clip=clip, alpha=False)
    doc.close()

    output_path.parent.mkdir(parents=True, exist_ok=True)
    pix.save(str(output_path))


# ---------------------------------------------------------------------------
# Step principal
# ---------------------------------------------------------------------------

def run(ctx: dict, conn) -> dict:
    articles    = ctx["articles_db"]
    document_id = ctx["document_id"]
    pdf_path    = str(ctx["path"])
    page_width  = ctx["page_size"]["width"]
    page_height = ctx["page_size"]["height"]
    now         = datetime.now(timezone.utc)

    crops_dir = PAGES_DIR / document_id / "crops"

    zones_db: list[dict] = []

    with conn.cursor() as cur:
        for i, article in enumerate(articles):
            next_article = articles[i + 1] if i + 1 < len(articles) else None

            x, y, w, h = _zone_rect(article, next_article, page_width, page_height)
            zone_id     = str(uuid.uuid4())
            image_file  = crops_dir / f"{zone_id}.png"

            # Rendu du crop
            try:
                _render_crop(pdf_path, article["page"], x, y, w, h, image_file)
                rel_image = str(image_file.relative_to(BASE_DIR / "public"))
            except Exception as exc:
                logger.warning(
                    f"    Crop échoué pour '{article['slug']}' (p.{article['page']}) : {exc}"
                )
                rel_image = ""

            cur.execute(
                """
                INSERT INTO pdf_zones
                    (id, "articleId", page, x, y, width, height,
                     "imagePath", "createdAt", "updatedAt")
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    zone_id,
                    article["article_id"],
                    article["page"],
                    x, y, w, h,
                    rel_image,
                    now, now,
                ),
            )

            zones_db.append(
                {
                    "zone_id":    zone_id,
                    "article_id": article["article_id"],
                    "page":       article["page"],
                    "x": x, "y": y, "width": w, "height": h,
                    "image_path": rel_image,
                }
            )

    ctx["zones_db"] = zones_db
    logger.info(f"  [ZONES] {len(zones_db)} zone(s) insérée(s)")
    return ctx
