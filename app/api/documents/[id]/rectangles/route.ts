import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildEffectiveLabelsMap } from "@/lib/labels";
import { parseNumberConfig } from "@/components/explore/FilterSidebar";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

// ─── Relevance scoring (CDC jalon 2) ──────────────────────────────────────────
// Sort filtered results by relevance, not by PDF reading order.
// Score is computed in memory because it depends on per-rectangle inheritance
// and on filter-type-specific match quality (own vs inherited label, whole-word
// vs substring text match) that cannot be expressed in a Prisma orderBy.

type ActiveFilterInfo =
  | { kind: "text"; value: string }
  | { kind: "label"; value: string }
  | { kind: "boolean" }
  | { kind: "numeric" };

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

// Type-of-rectangle bonus (always applied when filters are active).
// Mapping follows shared.ts type names:
//   article → +5, section → +3, all sub-section levels + paragraph → +1,
//   phrase / figure / table / formula / annexe → +0.
function typeBonus(type: string): number {
  switch (type) {
    case "article":
      return 5;
    case "section":
      return 3;
    case "subsection":
    case "subSubsection":
    case "subSubSubsection":
    case "subSubSubSubsection":
    case "subSubSubSubSubsection":
    case "subSubSubSubSubSubsection":
    case "paragraph":
      return 1;
    default:
      return 0;
  }
}

function scoreText(
  rect: { textFr: string | null; textEn: string | null; textNl: string | null },
  query: string,
): number {
  const haystack = [rect.textFr, rect.textEn, rect.textNl]
    .filter((s): s is string => !!s)
    .join("\n");
  if (!haystack) return 0;
  if (!haystack.toLowerCase().includes(query.toLowerCase())) return 0;
  const wordRe = new RegExp(`\\b${escapeRegex(query)}\\b`, "i");
  return wordRe.test(haystack) ? 40 : 20;
}

function computeRelevanceScore(
  rect: {
    type: string;
    labels: string[];
    textFr: string | null;
    textEn: string | null;
    textNl: string | null;
  },
  effective: string[],
  filters: ActiveFilterInfo[],
): number {
  if (filters.length === 0) return 0;

  let score = 0;
  const ownSet = new Set(rect.labels);

  for (const f of filters) {
    switch (f.kind) {
      case "text":
        score += scoreText(rect, f.value);
        break;
      case "label":
        if (ownSet.has(f.value)) score += 30;
        else if (effective.includes(f.value)) score += 10;
        break;
      case "boolean":
        score += 15;
        break;
      case "numeric":
        score += 25;
        break;
    }
  }

  score += typeBonus(rect.type);
  return score;
}

async function generateCropForRect(
  pdfPath: string,
  docId: string,
  rectId: string,
  page: number,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<void> {
  if (width < 0.1 || height < 0.1) return;
  const pdfAbsPath = join(process.cwd(), pdfPath);
  const outputPath = join(
    process.cwd(), "public", "pdf-pages", docId, "crops", `${rectId}.png`,
  );
  const scriptPath = join(process.cwd(), "python-pipeline", "crop_rectangle.py");
  try {
    await execFileAsync(
      "python3",
      [scriptPath, pdfAbsPath, String(page), String(x), String(y), String(width), String(height), outputPath],
      { timeout: 30_000 },
    );
  } catch (err) {
    console.error(`Crop generation failed for rect ${rectId}:`, err instanceof Error ? err.message : err);
  }
}

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/documents/:id/rectangles — rectangles for a document with filters
// Supports dynamic filters defined in the norm_filters table, plus built-in
// keywords and topic filters. All filters are combined with AND logic.
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);

  // Built-in text search (backward-compatible)
  const keywords = searchParams.get("keywords")?.trim();
  const topic = searchParams.get("topic")?.trim();

  const pdfPageParam = searchParams.get("pdfPage");
  const pdfPage = pdfPageParam ? Number(pdfPageParam) : null;

  const pageParam = Number(searchParams.get("page") ?? "1");
  const pageSizeParam = Number(searchParams.get("pageSize") ?? "120");
  const page = Number.isFinite(pageParam) && pageParam > 0 ? pageParam : 1;
  const pageSize = Math.min(
    300,
    Number.isFinite(pageSizeParam) && pageSizeParam > 0 ? pageSizeParam : 120
  );
  const skip = (page - 1) * pageSize;

  const filters: any[] = [{ documentId: id }];

  // Filter by PDF page number (used by the admin canvas editor).
  if (pdfPage !== null && Number.isFinite(pdfPage) && pdfPage > 0) {
    filters.push({ page: pdfPage });
  }

  // Text search: keywords act as a case-insensitive contains on all text columns.
  if (keywords) {
    filters.push({
      OR: [
        { textFr: { contains: keywords, mode: "insensitive" } },
        { textEn: { contains: keywords, mode: "insensitive" } },
        { textNl: { contains: keywords, mode: "insensitive" } },
      ],
    });
  }

  // Fetch the document's norm to get dynamic filter definitions
  const doc = await prisma.document.findUnique({
    where: { id },
    select: { normId: true },
  });

  // Collect all label-based filter values (topic + dynamic filters)
  const labelFilters: string[] = [];
  if (topic) labelFilters.push(topic);

  // Dynamic text search filters (from norm filter definitions)
  const textSearchValues: string[] = [];

  // Active filters tracked separately for relevance scoring.
  // The scoring rules differ per filter type, so we keep this typed list
  // alongside the where-clause construction below.
  const activeFilters: ActiveFilterInfo[] = [];
  if (keywords) activeFilters.push({ kind: "text", value: keywords });
  if (topic) activeFilters.push({ kind: "label", value: topic });

  // Numeric filters (number / range types)
  type NumericFilter =
    | { kind: "number"; label: string; value: number; operator: string }
    | { kind: "range"; label: string; min: number; max: number }
    | { kind: "date"; label: string; value: string };
  const numericFilters: NumericFilter[] = [];

  // Fetch filter definitions: norm-specific + global (normId=null)
  const normFilterWhere = doc?.normId
    ? { OR: [{ normId: doc.normId }, { normId: null }] }
    : { normId: null };
  const filterDefs = await prisma.normFilter.findMany({ where: normFilterWhere });

  for (const def of filterDefs) {
    const paramVal = searchParams.get(def.key)?.trim();
    if (!paramVal) continue;

    switch (def.type) {
      case "select":
        labelFilters.push(paramVal);
        activeFilters.push({ kind: "label", value: paramVal });
        break;

      case "multiselect": {
        const vals = paramVal.split(",").map((v) => v.trim()).filter(Boolean);
        for (const v of vals) {
          labelFilters.push(v);
          activeFilters.push({ kind: "label", value: v });
        }
        break;
      }

      case "boolean":
        if (paramVal === "yes") {
          labelFilters.push(def.label);
        }
        if (paramVal === "yes" || paramVal === "no") {
          activeFilters.push({ kind: "boolean" });
        }
        break;

      case "text":
        textSearchValues.push(paramVal);
        activeFilters.push({ kind: "text", value: paramVal });
        break;

      case "number": {
        const numVal = Number(paramVal);
        if (Number.isFinite(numVal)) {
          const cfg = parseNumberConfig(def.options);
          numericFilters.push({ kind: "number", label: def.label, value: numVal, operator: cfg.operator });
          activeFilters.push({ kind: "numeric" });
        }
        break;
      }

      case "range": {
        const parts = paramVal.split("-");
        const minVal = Number(parts[0]);
        const maxVal = Number(parts[1]);
        if (Number.isFinite(minVal) && Number.isFinite(maxVal)) {
          numericFilters.push({ kind: "range", label: def.label, min: minVal, max: maxVal });
          activeFilters.push({ kind: "numeric" });
        }
        break;
      }

      case "date":
        numericFilters.push({ kind: "date", label: def.label, value: paramVal });
        activeFilters.push({ kind: "numeric" });
        break;
    }
  }

  // Apply additional text search filters from dynamic "text" type filters
  for (const textVal of textSearchValues) {
    filters.push({
      OR: [
        { textFr: { contains: textVal, mode: "insensitive" } },
        { textEn: { contains: textVal, mode: "insensitive" } },
        { textNl: { contains: textVal, mode: "insensitive" } },
      ],
    });
  }

  // Numeric / range / date filters: extract numbers from labels and compare
  if (numericFilters.length > 0) {
    const allRects = await prisma.rectangle.findMany({
      where: { documentId: id },
      select: { id: true, labels: true, fatherId: true },
    });
    const effectiveLabelsMap = buildEffectiveLabelsMap(allRects);

    const passingIds = new Set<string>();
    for (const rect of allRects) {
      const effective = effectiveLabelsMap.get(rect.id) ?? [];
      const passesAll = numericFilters.every((nf) => {
        // Find a label that relates to this filter
        const matchingLabel = effective.find((l) =>
          l.toLowerCase().includes(nf.label.toLowerCase())
        );
        if (!matchingLabel) return false;

        if (nf.kind === "date") {
          // Date comparison: the label should contain a date string
          return matchingLabel.includes(nf.value);
        }

        // Extract the first number from the matching label
        const numMatch = matchingLabel.match(/-?\d+(\.\d+)?/);
        if (!numMatch) return false;
        const extracted = Number(numMatch[0]);

        if (nf.kind === "number") {
          switch (nf.operator) {
            case "gte": return extracted >= nf.value;
            case "lte": return extracted <= nf.value;
            case "gt":  return extracted > nf.value;
            case "lt":  return extracted < nf.value;
            case "eq":
            default:    return extracted === nf.value;
          }
        }

        if (nf.kind === "range") {
          return extracted >= nf.min && extracted <= nf.max;
        }

        return false;
      });
      if (passesAll) passingIds.add(rect.id);
    }
    filters.push({ id: { in: [...passingIds] } });
  }

  // Label-driven filters: use inherited labels (own + ancestors') per spec.
  if (labelFilters.length > 0) {
    const allRects = await prisma.rectangle.findMany({
      where: { documentId: id },
      select: { id: true, labels: true, fatherId: true },
    });
    const effectiveLabelsMap = buildEffectiveLabelsMap(allRects);

    const passingIds = new Set<string>();
    for (const rect of allRects) {
      const effective = effectiveLabelsMap.get(rect.id) ?? [];
      if (labelFilters.every((lf) => effective.includes(lf))) {
        passingIds.add(rect.id);
      }
    }

    filters.push({ id: { in: [...passingIds] } });
  }

  // Handle boolean "no" filters — exclude rectangles that have the label
  const booleanNoDefs = filterDefs.filter((d) => d.type === "boolean");
  for (const def of booleanNoDefs) {
    const paramVal = searchParams.get(def.key)?.trim();
    if (paramVal === "no") {
      const allRects = await prisma.rectangle.findMany({
        where: { documentId: id },
        select: { id: true, labels: true, fatherId: true },
      });
      const effectiveLabelsMap = buildEffectiveLabelsMap(allRects);
      const excludeIds: string[] = [];
      for (const rect of allRects) {
        const effective = effectiveLabelsMap.get(rect.id) ?? [];
        if (effective.includes(def.label)) {
          excludeIds.push(rect.id);
        }
      }
      if (excludeIds.length > 0) {
        filters.push({ id: { notIn: excludeIds } });
      }
    }
  }

  const where = filters.length ? { AND: filters } : { documentId: id };
  const include = {
    father: { select: { id: true, type: true, labels: true } },
    children: { select: { id: true, type: true, labels: true, page: true } },
  } as const;

  // No active filters → keep PDF reading order with DB-level pagination.
  // Every item gets relevanceScore: 0 (uniform, no ranking signal exists).
  if (activeFilters.length === 0) {
    const [rectangles, total] = await Promise.all([
      prisma.rectangle.findMany({
        where,
        orderBy: [{ page: "asc" }, { y: "asc" }, { x: "asc" }],
        skip,
        take: pageSize,
        include,
      }),
      prisma.rectangle.count({ where }),
    ]);

    const items = rectangles.map((r) => ({ ...r, relevanceScore: 0 }));
    const hasMore = skip + items.length < total;

    return NextResponse.json({ items, page, pageSize, total, hasMore });
  }

  // Active filters → score every match in memory, sort by relevance, paginate.
  // We must compute effective labels with the FULL document tree (parents may
  // contribute labels that the filtered set alone wouldn't see).
  const [matched, treeForLabels] = await Promise.all([
    prisma.rectangle.findMany({
      where,
      orderBy: [{ page: "asc" }, { y: "asc" }, { x: "asc" }],
      include,
    }),
    prisma.rectangle.findMany({
      where: { documentId: id },
      select: { id: true, labels: true, fatherId: true },
    }),
  ]);

  const effectiveLabelsMap = buildEffectiveLabelsMap(treeForLabels);

  const scored = matched.map((rect) => {
    const effective = effectiveLabelsMap.get(rect.id) ?? rect.labels;
    const relevanceScore = computeRelevanceScore(rect, effective, activeFilters);
    return { ...rect, relevanceScore };
  });

  // Sort: relevance DESC, then PDF reading order (page, y, x) ASC for a stable tiebreak.
  scored.sort((a, b) => {
    if (b.relevanceScore !== a.relevanceScore) return b.relevanceScore - a.relevanceScore;
    if (a.page !== b.page) return a.page - b.page;
    if (a.y !== b.y) return a.y - b.y;
    return a.x - b.x;
  });

  const total = scored.length;
  const items = scored.slice(skip, skip + pageSize);
  const hasMore = skip + items.length < total;

  return NextResponse.json({ items, page, pageSize, total, hasMore });
}

// POST /api/documents/:id/rectangles — create a new rectangle
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: documentId } = await context.params;

  // Verify document exists
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true, pdfPath: true },
  });
  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const body = await request.json();
  const { fatherId, type, labels, textFr, textEn, textNl, page, x, y, width, height } = body;

  // Validate required fields
  if (page == null || x == null || y == null || width == null || height == null) {
    return NextResponse.json(
      { error: "Fields page, x, y, width, height are required." },
      { status: 400 }
    );
  }

  // Check for overlaps on the same page
  const existing = await prisma.rectangle.findMany({
    where: { documentId, page },
    select: { id: true, x: true, y: true, width: true, height: true },
  });

  const overlapping = existing.find(
    (r) =>
      x < r.x + r.width &&
      x + width > r.x &&
      y < r.y + r.height &&
      y + height > r.y
  );

  if (overlapping) {
    return NextResponse.json(
      { error: `Rectangle overlaps with existing rectangle ${overlapping.id}.` },
      { status: 409 }
    );
  }

  // Validate fatherId if provided
  if (fatherId) {
    const father = await prisma.rectangle.findUnique({
      where: { id: fatherId },
      select: { documentId: true },
    });
    if (!father || father.documentId !== documentId) {
      return NextResponse.json(
        { error: "Father rectangle not found in this document." },
        { status: 400 }
      );
    }
  }

  const rectangle = await prisma.rectangle.create({
    data: {
      documentId,
      fatherId: fatherId || null,
      type: type || "paragraph",
      labels: labels || [],
      textFr: textFr || null,
      textEn: textEn || null,
      textNl: textNl || null,
      page,
      x,
      y,
      width,
      height,
    },
    include: {
      father: { select: { id: true, type: true, labels: true } },
      children: { select: { id: true, type: true, labels: true, page: true } },
    },
  });

  // Generate the crop image BEFORE returning success.
  await generateCropForRect(
    doc.pdfPath,
    documentId,
    rectangle.id,
    rectangle.page,
    rectangle.x,
    rectangle.y,
    rectangle.width,
    rectangle.height,
  );

  return NextResponse.json(rectangle, { status: 201 });
}
