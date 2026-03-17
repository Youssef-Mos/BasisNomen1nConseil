"""
steps/extract_structure.py — Étape 4 : extraction des blocs texte.

Utilise PyMuPDF (page.get_text("dict")) pour extraire, pour chaque ligne :
- le texte
- la page (1-based)
- le bbox (x0, y0, x1, y1) en PDF points
- la taille de police dominante
- le style gras / italique

Entrée ctx attendue :
    path : Path — chemin absolu du PDF

Sortie ctx ajoutée :
    text_blocks : list[dict]
        text      : str
        page      : int
        bbox      : tuple[float, float, float, float]
        font_size : float
        is_bold   : bool
        is_italic : bool
"""

import logging

import fitz

logger = logging.getLogger(__name__)

# Flags PyMuPDF (champ `flags` d'un span)
_FLAG_BOLD   = 2 ** 4  # 16
_FLAG_ITALIC = 2 ** 1  # 2


def run(ctx: dict, conn) -> dict:
    pdf_path = ctx["path"]
    doc      = fitz.open(str(pdf_path))
    blocks: list[dict] = []

    try:
        for page_index in range(len(doc)):
            page_num  = page_index + 1
            page_data = doc[page_index].get_text(
                "dict", flags=fitz.TEXT_PRESERVE_WHITESPACE
            )

            for block in page_data.get("blocks", []):
                if block.get("type") != 0:  # 0 = bloc texte
                    continue

                for line in block.get("lines", []):
                    line_text    = ""
                    font_sizes: list[float] = []
                    flags        = 0

                    for span in line.get("spans", []):
                        text = span.get("text", "").strip()
                        if not text:
                            continue
                        line_text += text + " "
                        font_sizes.append(span.get("size", 0.0))
                        flags |= span.get("flags", 0)

                    line_text = line_text.strip()
                    if not line_text:
                        continue

                    blocks.append(
                        {
                            "text":      line_text,
                            "page":      page_num,
                            "bbox":      tuple(line.get("bbox", (0, 0, 0, 0))),
                            "font_size": round(max(font_sizes, default=0.0), 2),
                            "is_bold":   bool(flags & _FLAG_BOLD),
                            "is_italic": bool(flags & _FLAG_ITALIC),
                        }
                    )
    finally:
        doc.close()

    ctx["text_blocks"] = blocks
    logger.info(f"  [STRUCT] {len(blocks)} ligne(s) texte extraites")
    return ctx
