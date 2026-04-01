"""
smart_analyze.py — Smart hierarchical structural analysis of norm PDFs.

Three-stage pipeline:
  Stage 1: Low-level extraction (lines + font metadata + page dimensions)
  Stage 2: Structural inference (header filtering, title detection, level assignment)
  Stage 3: Smart grouping (merge paragraphs, deduplicate titles, assign parents)

Usage:
    python smart_analyze.py <pdf_path>

Outputs JSON to stdout with hierarchical nodes and parent references.
Coordinates are percentages (0–100) relative to page dimensions.
"""

import json
import re
import sys
from collections import Counter
from dataclasses import dataclass
from pathlib import Path

try:
    import fitz  # PyMuPDF
except ImportError:
    print(json.dumps({"error": "PyMuPDF (fitz) is not installed. Run: pip install PyMuPDF"}))
    sys.exit(1)

# ═══════════════════════════════════════════════════════════════════════════
# Data structures
# ═══════════════════════════════════════════════════════════════════════════

_FLAG_BOLD = 1 << 4

@dataclass
class Line:
    text: str
    page: int
    bbox: tuple  # (x0, y0, x1, y1) PDF points
    font_size: float
    is_bold: bool
    is_italic: bool
    x_pct: float = 0.0
    y_pct: float = 0.0
    w_pct: float = 0.0
    h_pct: float = 0.0


@dataclass
class Node:
    index: int = 0
    parent_index: int | None = None
    page: int = 1
    x: float = 0.0
    y: float = 0.0
    width: float = 0.0
    height: float = 0.0
    rect_type: str = "paragraph"
    text: str = ""
    level: int = 0  # 0 = leaf, >0 = structural


# ═══════════════════════════════════════════════════════════════════════════
# Stage 1 — Low-level extraction
# ═══════════════════════════════════════════════════════════════════════════

def extract_lines(pdf_path: str) -> tuple[list[Line], dict[int, tuple[float, float]]]:
    doc = fitz.open(pdf_path)
    lines: list[Line] = []
    page_dims: dict[int, tuple[float, float]] = {}

    for pi in range(len(doc)):
        page = doc[pi]
        pw, ph = page.rect.width, page.rect.height
        if pw == 0 or ph == 0:
            continue
        pn = pi + 1
        page_dims[pn] = (pw, ph)

        for block in page.get_text("dict", flags=fitz.TEXT_PRESERVE_WHITESPACE).get("blocks", []):
            if block.get("type") != 0:
                continue
            for ld in block.get("lines", []):
                parts, sizes, bold, italic = [], [], False, False
                for span in ld.get("spans", []):
                    t = span.get("text", "").strip()
                    if t:
                        parts.append(t)
                        sizes.append(span.get("size", 0.0))
                        f = span.get("flags", 0)
                        if f & _FLAG_BOLD: bold = True
                        if f & 2: italic = True
                text = " ".join(parts).strip()
                if not text:
                    continue
                bb = tuple(ld.get("bbox", (0, 0, 0, 0)))
                lines.append(Line(
                    text=text, page=pn, bbox=bb,
                    font_size=round(max(sizes) if sizes else 10.0, 2),
                    is_bold=bold, is_italic=italic,
                    x_pct=round(bb[0] / pw * 100, 2),
                    y_pct=round(bb[1] / ph * 100, 2),
                    w_pct=round((bb[2] - bb[0]) / pw * 100, 2),
                    h_pct=round((bb[3] - bb[1]) / ph * 100, 2),
                ))
    doc.close()
    return lines, page_dims


# ═══════════════════════════════════════════════════════════════════════════
# Stage 2 — Structural inference
# ═══════════════════════════════════════════════════════════════════════════

def detect_header_footer_zones(lines: list[Line]) -> tuple[float, float]:
    """Detect header/footer Y boundaries using position-frequency analysis.

    Lines that appear at the same Y-band (±1%) on many pages are headers/footers.
    """
    if not lines:
        return 12.0, 90.0

    page_count = max(ln.page for ln in lines)
    if page_count < 3:
        return 8.0, 92.0

    # Bucket lines by Y-position (1% buckets) and count how many DISTINCT pages
    top_buckets: dict[int, set[int]] = {}  # bucket → set of pages
    bot_buckets: dict[int, set[int]] = {}

    for ln in lines:
        bucket = int(ln.y_pct)
        if ln.y_pct < 20:
            top_buckets.setdefault(bucket, set()).add(ln.page)
        if ln.y_pct > 80:
            bot_buckets.setdefault(bucket, set()).add(ln.page)

    # Y-buckets present on > 40% of pages are in the header/footer zone
    threshold = page_count * 0.4

    header_y_max = 6.0  # minimum default
    for bucket, pages in sorted(top_buckets.items()):
        if len(pages) >= threshold:
            header_y_max = max(header_y_max, bucket + 2.0)

    footer_y_min = 95.0
    for bucket, pages in sorted(bot_buckets.items(), reverse=True):
        if len(pages) >= threshold:
            footer_y_min = min(footer_y_min, bucket - 1.0)

    return round(header_y_max, 1), round(footer_y_min, 1)


def compute_body_font_size(lines: list[Line], header_y: float, footer_y: float) -> float:
    """Most common font size in the content zone = body text."""
    content_lines = [ln for ln in lines if header_y <= ln.y_pct <= footer_y]
    if not content_lines:
        return 10.0
    c = Counter(ln.font_size for ln in content_lines)
    return c.most_common(1)[0][0]


# --- Title detection patterns ---

_NUM_PATTERNS: list[tuple[re.Pattern, int]] = [
    (re.compile(r"^(\d{1,3}(?:\.\d{1,3}){4,})\b"), 6),
    (re.compile(r"^(\d{1,3}(?:\.\d{1,3}){3})\b"), 5),
    (re.compile(r"^(\d{1,3}\.\d{1,3}\.\d{1,3})\b"), 4),
    (re.compile(r"^(\d{1,3}\.\d{1,3})\b"), 3),
    (re.compile(r"^(\d{1,3})\s+[A-ZÉÈÀÙÂÎÊŒÜ]"), 2),
]

_ANNEXE_RE = re.compile(r"^ANNEXE\s+(\d+(?:/\d+)?)\b", re.IGNORECASE)
_ART_RE = re.compile(r"^Art\.\s*(\d+(?:/\d+)?)\b")
_CHAPITRE_RE = re.compile(r"^(?:CHAPITRE|CHAPTER)\s+(\d+)", re.IGNORECASE)
_FIGURE_RE = re.compile(r"^(?:Fig(?:ure)?\.?|Tableau|Table)\s+(\d+)", re.IGNORECASE)
_FORMULA_RE = re.compile(r"^(?:Formul[ea])\s", re.IGNORECASE)


def classify_line(ln: Line, body_fs: float) -> tuple[str, int, str]:
    """Returns (role, level, rect_type) for a single line.
    role: 'title' | 'body' | 'special'
    """
    text = ln.text.strip()
    if len(text) < 2:
        return "body", 0, "paragraph"

    # Annexe
    m = _ANNEXE_RE.match(text)
    if m:
        return "title", 1, "annexe"

    # Full uppercase title containing ANNEXE
    if "ANNEXE" in text.upper() and text == text.upper() and len(text) < 100 and ln.is_bold:
        return "title", 1, "annexe"

    # Chapter
    m = _CHAPITRE_RE.match(text)
    if m:
        return "title", 1, "section"

    # Article (Art. X) — top-level regulatory articles
    m = _ART_RE.match(text)
    if m:
        return "title", 2, "article"

    # Figure / Table
    m = _FIGURE_RE.match(text)
    if m:
        word = text.split()[0].lower().rstrip(".")
        return "special", 0, "table" if word in ("tableau", "table") else "figure"

    # Formula
    if _FORMULA_RE.match(text):
        return "special", 0, "formula"

    # Numbered patterns (1, 1.1, 1.1.1, ...)
    for pat, depth in _NUM_PATTERNS:
        if pat.match(text):
            rtype = "section" if depth <= 3 else "article"
            return "title", depth, rtype

    # Typographic: bold + larger than body + short + no period → title
    if ln.is_bold and ln.font_size > body_fs and len(text) < 120 and not text.endswith("."):
        return "title", 2, "section"

    # Bold body-size short text starting with uppercase → sub-title
    if ln.is_bold and ln.font_size >= body_fs and len(text) < 80 and not text.endswith(".") and text[0].isupper():
        return "title", 3, "article"

    # Full uppercase bold short → title
    if text == text.upper() and len(text) > 3 and len(text) < 100 and ln.is_bold:
        return "title", 2, "section"

    return "body", 0, "paragraph"


# ═══════════════════════════════════════════════════════════════════════════
# Stage 3 — Smart grouping
# ═══════════════════════════════════════════════════════════════════════════

def _should_split(prev: Line, curr: Line) -> bool:
    """Whether to start a new paragraph between two body lines."""
    if prev.page != curr.page:
        return True
    gap = curr.y_pct - (prev.y_pct + prev.h_pct)
    if gap > 3.0:
        return True
    if abs(curr.x_pct - prev.x_pct) > 8.0:
        return True
    if abs(curr.font_size - prev.font_size) > 1.5:
        return True
    return False


def _make_paragraph(body_lines: list[Line]) -> Node:
    """Merge consecutive body lines into one paragraph Node."""
    text = " ".join(ln.text for ln in body_lines).strip()
    x_min = min(ln.x_pct for ln in body_lines)
    y_min = min(ln.y_pct for ln in body_lines)
    x_max = max(ln.x_pct + ln.w_pct for ln in body_lines)
    y_max = max(ln.y_pct + ln.h_pct for ln in body_lines)
    return Node(
        page=body_lines[0].page,
        x=round(x_min, 2), y=round(y_min, 2),
        width=round(x_max - x_min, 2), height=round(y_max - y_min, 2),
        rect_type="paragraph", text=text[:1500], level=0,
    )


def group_and_build(lines: list[Line], header_y: float, footer_y: float, body_fs: float) -> list[Node]:
    """Filter, classify, merge, deduplicate, and assign hierarchy."""

    # ── Pass 1: filter + classify ──
    classified: list[tuple[Line, str, int, str]] = []  # (line, role, level, type)
    for ln in lines:
        if ln.y_pct < header_y or ln.y_pct > footer_y:
            continue
        if ln.w_pct < 1:
            continue
        role, level, rtype = classify_line(ln, body_fs)
        classified.append((ln, role, level, rtype))

    # ── Pass 2: merge body lines into paragraphs, keep titles as-is ──
    nodes: list[Node] = []
    body_buf: list[Line] = []

    def flush():
        if body_buf:
            nodes.append(_make_paragraph(body_buf))
            body_buf.clear()

    for ln, role, level, rtype in classified:
        if role in ("title", "special"):
            flush()
            nodes.append(Node(
                page=ln.page,
                x=round(ln.x_pct, 2), y=round(ln.y_pct, 2),
                width=round(ln.w_pct, 2), height=round(ln.h_pct, 2),
                rect_type=rtype, text=ln.text.strip()[:500], level=level,
            ))
        else:  # body
            if body_buf and _should_split(body_buf[-1], ln):
                flush()
            body_buf.append(ln)
    flush()

    # ── Pass 3: deduplicate repeating titles ──
    # If the same title text + type appears on consecutive pages, keep only the first.
    deduped: list[Node] = []
    seen_titles: dict[str, int] = {}  # "type:text" → last page

    for node in nodes:
        if node.level > 0:
            key = f"{node.rect_type}:{node.text[:60]}"
            last_page = seen_titles.get(key)
            if last_page is not None and abs(node.page - last_page) <= 2:
                # Duplicate title on adjacent page — skip
                seen_titles[key] = node.page
                continue
            seen_titles[key] = node.page
        deduped.append(node)

    # ── Pass 4: assign indices and hierarchy ──
    parent_at: dict[int, int] = {}  # level → node index

    for i, node in enumerate(deduped):
        node.index = i

        if node.level > 0:
            # Structural title: parent is nearest ancestor at any lower level
            parent = None
            for lv in range(node.level - 1, 0, -1):
                if lv in parent_at:
                    parent = parent_at[lv]
                    break
            node.parent_index = parent
            parent_at[node.level] = i
            # Clear deeper levels
            for k in [k for k in parent_at if k > node.level]:
                del parent_at[k]
        else:
            # Paragraph: child of deepest current title
            if parent_at:
                node.parent_index = parent_at[max(parent_at)]

    return deduped


# ═══════════════════════════════════════════════════════════════════════════
# Main
# ═══════════════════════════════════════════════════════════════════════════

def analyze(pdf_path: str) -> dict:
    lines, page_dims = extract_lines(pdf_path)
    if not lines:
        return {"nodes": []}

    header_y, footer_y = detect_header_footer_zones(lines)
    body_fs = compute_body_font_size(lines, header_y, footer_y)
    nodes = group_and_build(lines, header_y, footer_y, body_fs)

    return {"nodes": [
        {
            "index": n.index,
            "parentIndex": n.parent_index,
            "page": n.page,
            "x": n.x, "y": n.y,
            "width": n.width, "height": n.height,
            "type": n.rect_type,
            "text": n.text,
        }
        for n in nodes
    ]}


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Usage: python smart_analyze.py <pdf_path>"}))
        sys.exit(1)

    path = sys.argv[1]
    if not Path(path).exists():
        print(json.dumps({"error": f"File not found: {path}"}))
        sys.exit(1)

    print(json.dumps(analyze(path), ensure_ascii=False))
