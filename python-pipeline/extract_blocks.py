"""
extract_blocks.py — Extract text blocks from a PDF as rectangle suggestions.

Usage:
    python extract_blocks.py <pdf_path>

Outputs JSON to stdout:
    [
      { "page": 1, "x": 5.2, "y": 10.1, "width": 89.5, "height": 3.4, "type": "paragraph", "text": "..." },
      ...
    ]

Coordinates are percentages (0–100) relative to page dimensions.
Only text blocks are extracted (no images).
"""

import json
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed. Run: pip install PyMuPDF"}))
    sys.exit(1)


def extract(pdf_path: str) -> list[dict]:
    doc = fitz.open(pdf_path)
    blocks = []

    for page_idx in range(len(doc)):
        page = doc[page_idx]
        page_w = page.rect.width
        page_h = page.rect.height

        if page_w == 0 or page_h == 0:
            continue

        page_dict = page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE)

        for block in page_dict.get("blocks", []):
            # Skip image blocks
            if block.get("type") != 0:
                continue

            bbox = block.get("bbox")
            if not bbox:
                continue

            x0, y0, x1, y1 = bbox

            # Convert to percentages of page dimensions
            x_pct = (x0 / page_w) * 100
            y_pct = (y0 / page_h) * 100
            w_pct = ((x1 - x0) / page_w) * 100
            h_pct = ((y1 - y0) / page_h) * 100

            # Skip tiny blocks (noise)
            if w_pct < 1 or h_pct < 0.3:
                continue

            # Extract plain text from block lines
            text_parts = []
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    t = span.get("text", "").strip()
                    if t:
                        text_parts.append(t)

            text = " ".join(text_parts).strip()
            if not text:
                continue

            # Guess type from block characteristics
            avg_font_size = 0
            span_count = 0
            is_bold = False
            for line in block.get("lines", []):
                for span in line.get("spans", []):
                    avg_font_size += span.get("size", 10)
                    span_count += 1
                    flags = span.get("flags", 0)
                    if flags & 2 ** 4:  # bold flag
                        is_bold = True

            avg_font_size = avg_font_size / max(span_count, 1)

            # Heuristic: large bold text → section, medium bold → article, else paragraph
            if avg_font_size > 14 and is_bold:
                block_type = "section"
            elif avg_font_size > 11 and is_bold:
                block_type = "article"
            elif h_pct < 2:
                block_type = "phrase"
            else:
                block_type = "paragraph"

            blocks.append({
                "page": page_idx + 1,
                "x": round(x_pct, 2),
                "y": round(y_pct, 2),
                "width": round(w_pct, 2),
                "height": round(h_pct, 2),
                "type": block_type,
                "text": text[:500],  # Cap text length
            })

    doc.close()
    return blocks


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python extract_blocks.py <pdf_path>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not Path(pdf_path).exists():
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    result = extract(pdf_path)
    print(json.dumps(result, ensure_ascii=False))
