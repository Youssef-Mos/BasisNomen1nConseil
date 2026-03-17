"""
steps/build_hierarchy.py — Étape 6 : construction de la hiérarchie + INSERT articles.

Prend detected_articles (liste plate ordonnée) et :
1. Génère un ID et un slug pour chaque article
2. Reconstruit l'arbre parent/enfant (algorithme de pile de niveaux)
3. Calcule les orderIndex parmi les frères
4. INSERT dans la table `articles`

Entrée ctx attendue :
    detected_articles : list[dict]
    document_id       : str

Sortie ctx ajoutée :
    articles_db : list[dict]
        article_id  : str
        slug        : str
        title       : str
        level       : int
        page        : int
        bbox        : tuple
        parent_id   : str | None
        order_index : int
"""

import logging
import re
import unicodedata
import uuid
from datetime import datetime, timezone

logger = logging.getLogger(__name__)


# ---------------------------------------------------------------------------
# Slugification
# ---------------------------------------------------------------------------

def _slugify(text: str) -> str:
    """Produit un slug URL-safe à partir d'une chaîne."""
    text = text.lower().strip()
    # Supprimer les accents
    text = unicodedata.normalize("NFD", text)
    text = "".join(c for c in text if unicodedata.category(c) != "Mn")
    # Remplacer tout caractère non alphanumérique par un tiret
    text = re.sub(r"[^a-z0-9]+", "-", text)
    return text.strip("-") or "article"


def _unique_slug(base: str, used: set[str]) -> str:
    """Ajoute un suffixe numérique jusqu'à obtenir un slug unique."""
    slug, n = base, 2
    while slug in used:
        slug = f"{base}-{n}"
        n += 1
    return slug


# ---------------------------------------------------------------------------
# Construction de l'arbre
# ---------------------------------------------------------------------------

def _build_tree(articles: list[dict]) -> list[dict]:
    """
    Parcourt la liste plate et assigne parent_id + order_index à chaque nœud.

    Algorithme : pile de niveaux.
    - parent_at[N]  = article_id du dernier nœud introduit au niveau N
    - order_by[pid] = compteur d'enfants directs pour ce parent
    """
    parent_at: dict[int, str | None] = {}   # niveau → article_id courant
    order_by:  dict[str | None, int] = {}   # parent_id → prochain orderIndex

    result: list[dict] = []

    for article in articles:
        level     = article["level"]
        parent_id = parent_at.get(level - 1)  # None si niveau racine

        order = order_by.get(parent_id, 0)
        order_by[parent_id] = order + 1

        result.append({**article, "parent_id": parent_id, "order_index": order})

        # Enregistrer cet article comme parent courant de son niveau
        parent_at[level] = article["article_id"]

        # Invalider les niveaux plus profonds (ils ne peuvent plus être parents)
        for deeper in [k for k in parent_at if k > level]:
            del parent_at[deeper]

    return result


# ---------------------------------------------------------------------------
# Step principal
# ---------------------------------------------------------------------------

def run(ctx: dict, conn) -> dict:
    detected    = ctx["detected_articles"]
    document_id = ctx["document_id"]
    now         = datetime.now(timezone.utc)

    used_slugs: set[str] = set()

    # Phase 1 — générer IDs et slugs
    articles_with_ids: list[dict] = []
    for article in detected:
        base_slug = _slugify(article.get("number") or article["text"][:60])
        slug      = _unique_slug(base_slug, used_slugs)
        used_slugs.add(slug)

        articles_with_ids.append(
            {**article, "article_id": str(uuid.uuid4()), "slug": slug}
        )

    # Phase 2 — construire l'arbre
    articles_tree = _build_tree(articles_with_ids)

    # Phase 3 — INSERT en base
    with conn.cursor() as cur:
        for a in articles_tree:
            cur.execute(
                """
                INSERT INTO articles
                    (id, "documentId", "parentId", title, slug, level,
                     "orderIndex", "pageStart", "pageEnd", "createdAt", "updatedAt")
                VALUES
                    (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s)
                """,
                (
                    a["article_id"],
                    document_id,
                    a["parent_id"],
                    a["text"],
                    a["slug"],
                    a["level"],
                    a["order_index"],
                    a["page"],
                    None,       # pageEnd — non calculé à ce stade
                    now,
                    now,
                ),
            )

    ctx["articles_db"] = articles_tree
    logger.info(f"  [HIER] {len(articles_tree)} article(s) insérés en base")
    return ctx
