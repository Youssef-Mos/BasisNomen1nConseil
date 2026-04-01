"""
extract_text_zone.py — Extract text from a specific rectangular zone of a PDF page.

Usage:
    python extract_text_zone.py <pdf_path> <page> <x_pct> <y_pct> <w_pct> <h_pct>

Coordinates are percentages (0–100) of the page dimensions.
Outputs JSON: {"text": "..."} or {"text": null} if no text found.
On error: {"error": "..."}
"""

import json
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed. Run: pip install PyMuPDF"}))
    sys.exit(1)


def extract_zone_text(pdf_path: str, page_num: int, x_pct: float, y_pct: float, w_pct: float, h_pct: float) -> str | None:
    """Extract native text from a percentage-based rectangle on a PDF page."""
    doc = fitz.open(pdf_path)

    if page_num < 1 or page_num > len(doc):
        doc.close()
        return None

    page = doc[page_num - 1]
    pw, ph = page.rect.width, page.rect.height

    # Convert percentage coordinates to PDF points
    x0 = x_pct / 100 * pw
    y0 = y_pct / 100 * ph
    x1 = (x_pct + w_pct) / 100 * pw
    y1 = (y_pct + h_pct) / 100 * ph

    rect = fitz.Rect(x0, y0, x1, y1)
    text = page.get_text("text", clip=rect).strip()
    doc.close()

    return text or None


if __name__ == "__main__":
    if len(sys.argv) < 7:
        print(json.dumps({"error": "Usage: python extract_text_zone.py <pdf_path> <page> <x%> <y%> <w%> <h%>"}))
        sys.exit(1)

    pdf_path = sys.argv[1]
    if not Path(pdf_path).exists():
        print(json.dumps({"error": f"File not found: {pdf_path}"}))
        sys.exit(1)

    try:
        page_num = int(sys.argv[2])
        x_pct = float(sys.argv[3])
        y_pct = float(sys.argv[4])
        w_pct = float(sys.argv[5])
        h_pct = float(sys.argv[6])
    except ValueError as e:
        print(json.dumps({"error": f"Invalid argument: {e}"}))
        sys.exit(1)

    text = extract_zone_text(pdf_path, page_num, x_pct, y_pct, w_pct, h_pct)
    print(json.dumps({"text": text}, ensure_ascii=False))
