"""
crop_rectangle.py — Render a rectangle region from a PDF page and save as PNG.

Usage:
    python crop_rectangle.py <pdf_path> <page> <x_pct> <y_pct> <w_pct> <h_pct> <output_path>

Coordinates are percentages (0–100) of the page dimensions.
Output path directory will be created automatically if it does not exist.

Outputs JSON:
  {"path": "<output_path>"}   on success
  {"error": "<message>"}      on failure

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

CROP_DPI = 200  # Higher resolution than page renders (150 DPI) for crisp detail.


def crop_zone(
    pdf_path: str,
    page_num: int,
    x_pct: float,
    y_pct: float,
    w_pct: float,
    h_pct: float,
    output_path: str,
) -> str | None:
    """
    Render the rectangle region (x_pct, y_pct, w_pct, h_pct) on page_num of
    pdf_path to a PNG file at output_path.

    All coordinate parameters are percentages (0–100) of the page dimensions.
    Returns the output_path string on success, or None on failure.
    """
    if w_pct < 0.1 or h_pct < 0.1:
        return None  # Degenerate rectangle — nothing to render.

    doc = fitz.open(pdf_path)

    if page_num < 1 or page_num > len(doc):
        doc.close()
        return None

    page = doc[page_num - 1]
    pw = page.rect.width
    ph = page.rect.height

    # Convert percentage coordinates to PDF points.
    x0 = x_pct / 100.0 * pw
    y0 = y_pct / 100.0 * ph
    x1 = (x_pct + w_pct) / 100.0 * pw
    y1 = (y_pct + h_pct) / 100.0 * ph

    # Clamp to page boundaries.
    x0 = max(0.0, min(x0, pw))
    y0 = max(0.0, min(y0, ph))
    x1 = max(x0 + 1.0, min(x1, pw))
    y1 = max(y0 + 1.0, min(y1, ph))

    clip = fitz.Rect(x0, y0, x1, y1)
    mat = fitz.Matrix(CROP_DPI / 72.0, CROP_DPI / 72.0)
    pix = page.get_pixmap(matrix=mat, clip=clip, alpha=False)

    Path(output_path).parent.mkdir(parents=True, exist_ok=True)
    pix.save(output_path)
    doc.close()

    return output_path


if __name__ == "__main__":
    if len(sys.argv) < 8:
        print(json.dumps({
            "error": (
                "Usage: python crop_rectangle.py "
                "<pdf_path> <page> <x%> <y%> <w%> <h%> <output_path>"
            )
        }))
        sys.exit(1)

    pdf_path_arg = sys.argv[1]
    if not Path(pdf_path_arg).exists():
        print(json.dumps({"error": f"File not found: {pdf_path_arg}"}))
        sys.exit(1)

    try:
        page_num_arg = int(sys.argv[2])
        x_pct_arg = float(sys.argv[3])
        y_pct_arg = float(sys.argv[4])
        w_pct_arg = float(sys.argv[5])
        h_pct_arg = float(sys.argv[6])
        output_path_arg = sys.argv[7]
    except ValueError as exc:
        print(json.dumps({"error": f"Invalid argument: {exc}"}))
        sys.exit(1)

    result = crop_zone(
        pdf_path_arg,
        page_num_arg,
        x_pct_arg,
        y_pct_arg,
        w_pct_arg,
        h_pct_arg,
        output_path_arg,
    )

    if result:
        print(json.dumps({"path": result}))
    else:
        print(json.dumps({"error": "Crop generation failed (degenerate rect or page out of range)."}))
        sys.exit(1)
