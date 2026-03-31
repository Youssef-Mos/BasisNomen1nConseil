"""
render_pages.py — Render every page of a PDF to a PNG file.

Usage:
    python render_pages.py <pdf_path> <output_dir>

Renders each page at PAGE_DPI (150) and saves as:
    <output_dir>/page-001.png
    <output_dir>/page-002.png
    ...

Outputs JSON on stdout:
  {"pages": <count>}         on success
  {"error": "<message>"}     on failure

Exit codes: 0 = success, 1 = error.
"""

import json
import sys
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed. Run: pip install PyMuPDF"}))
    sys.exit(1)

PAGE_DPI = 150  # Matches config.py PAGE_DPI.


def render_pages(pdf_path: str, output_dir: str) -> int:
    """
    Render all pages of the PDF to PNG files in output_dir.
    Returns the number of pages rendered.
    """
    doc = fitz.open(pdf_path)
    out = Path(output_dir)
    out.mkdir(parents=True, exist_ok=True)

    mat = fitz.Matrix(PAGE_DPI / 72.0, PAGE_DPI / 72.0)

    for i, page in enumerate(doc, start=1):
        pix = page.get_pixmap(matrix=mat, alpha=False)
        pix.save(str(out / f"page-{i:03d}.png"))

    count = len(doc)
    doc.close()
    return count


if __name__ == "__main__":
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Usage: python render_pages.py <pdf_path> <output_dir>"}))
        sys.exit(1)

    pdf_arg = sys.argv[1]
    if not Path(pdf_arg).exists():
        print(json.dumps({"error": f"File not found: {pdf_arg}"}))
        sys.exit(1)

    try:
        n = render_pages(pdf_arg, sys.argv[2])
        print(json.dumps({"pages": n}))
    except Exception as exc:
        print(json.dumps({"error": str(exc)}))
        sys.exit(1)
