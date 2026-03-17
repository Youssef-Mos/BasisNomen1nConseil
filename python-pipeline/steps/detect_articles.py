"""
steps/detect_articles.py — Étape 5 : détection des titres d'articles.

Applique des regex et heuristiques typographiques sur text_blocks pour
identifier les titres de sections, articles et sous-articles.

Stratégie :
1. Regex sur les préfixes numériques et mots-clés (Article, Annexe, Chapitre…)
2. Heuristique de secours : texte court + gras + grande police → titre probable
3. Level déterminé par le pattern ou la profondeur numérique

Entrée ctx attendue :
    text_blocks : list[dict]

Sortie ctx ajoutée :
    detected_articles : list[dict]
        text   : str
        level  : int   (1 = chapitre, 2 = section, 3 = sous-section, …)
        page   : int
        bbox   : tuple
        number : str | None   (préfixe numérique ou mot-clé extrait)
"""

import logging
import re

logger = logging.getLogger(__name__)

# ---------------------------------------------------------------------------
# Patterns — du plus spécifique au moins spécifique
# Chaque entrée : (regex compilé, level)
# ---------------------------------------------------------------------------

_PATTERNS: list[tuple[re.Pattern, int]] = [
    # Niveau 4  ex. "1.2.3.4 ..."
    (re.compile(r"^\d{1,2}\.\d{1,2}\.\d{1,2}\.\d{1,2}[\s\.]"), 4),
    # Niveau 3  ex. "1.2.3 ..."
    (re.compile(r"^\d{1,2}\.\d{1,2}\.\d{1,2}[\s\.]"), 3),
    # Niveau 2  ex. "1.2 ..."
    (re.compile(r"^\d{1,2}\.\d{1,2}[\s\.]"), 2),
    # Niveau 1  ex. "Article 1", "Article 1er", "Article 1.2"
    (re.compile(r"^article\s+\d+", re.IGNORECASE), 1),
    # Niveau 1  ex. "Annexe A", "Annexe 1"
    (re.compile(r"^annexe\s+[A-Z0-9]+", re.IGNORECASE), 1),
    # Niveau 1  ex. "Chapitre 3"
    (re.compile(r"^chapitre\s+\d+", re.IGNORECASE), 1),
    # Niveau 1  ex. "1 Titre" (chiffre seul suivi d'une majuscule)
    (re.compile(r"^\d{1,2}\s+[A-ZÉÈÀÙÂÎÊŒ]"), 1),
    # Niveau 2  ex. "Section 1.2"
    (re.compile(r"^section\s+\d+", re.IGNORECASE), 2),
]

# Taille de police au-delà de laquelle une ligne est considérée "grande"
_LARGE_FONT = 11.0
# Longueur max d'une ligne pour être considérée comme un titre
_MAX_TITLE_LEN = 180


def _classify(block: dict) -> tuple[int | None, str | None]:
    """
    Retourne (level, number_prefix) si le bloc est un titre, (None, None) sinon.
    """
    text = block["text"].strip()

    if not text or len(text) > _MAX_TITLE_LEN:
        return None, None

    # Test des patterns regex
    for pattern, level in _PATTERNS:
        m = pattern.match(text)
        if m:
            return level, m.group(0).strip()

    # Heuristique de repli : texte court + gras + grande police
    if (
        block["is_bold"]
        and block["font_size"] >= _LARGE_FONT
        and len(text) <= 100
    ):
        return 1, None

    return None, None


def run(ctx: dict, conn) -> dict:
    text_blocks = ctx["text_blocks"]
    articles: list[dict] = []

    for block in text_blocks:
        level, number = _classify(block)
        if level is None:
            continue

        articles.append(
            {
                "text":   block["text"].strip(),
                "level":  level,
                "page":   block["page"],
                "bbox":   block["bbox"],
                "number": number,
            }
        )

    ctx["detected_articles"] = articles
    logger.info(f"  [DETECT] {len(articles)} titre(s) détecté(s)")
    return ctx
