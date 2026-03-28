import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RECTANGLE_TYPES } from "@/lib/types";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

type RouteContext = { params: Promise<{ id: string }> };

/**
 * Extract text from a rectangle's zone in the PDF.
 * Returns the extracted text or null on failure.
 */
async function extractTextForZone(
  pdfPath: string,
  page: number,
  x: number,
  y: number,
  width: number,
  height: number,
): Promise<string | null> {
  if (width < 0.5 || height < 0.5) return null;

  const pdfAbsPath = join(process.cwd(), pdfPath);
  const scriptPath = join(process.cwd(), "python-pipeline", "extract_text_zone.py");

  try {
    const { stdout } = await execFileAsync(
      "python3",
      [scriptPath, pdfAbsPath, String(page), String(x), String(y), String(width), String(height)],
      { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 },
    );
    const parsed = JSON.parse(stdout);
    return parsed.text ?? null;
  } catch (err) {
    console.error("Text extraction failed:", err instanceof Error ? err.message : err);
    return null;
  }
}

// PUT /api/rectangles/:id — update a rectangle
export async function PUT(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const existing = await prisma.rectangle.findUnique({
    where: { id },
    include: { document: { select: { pdfPath: true } } },
  });

  if (!existing) {
    return NextResponse.json({ error: "Rectangle not found." }, { status: 404 });
  }

  const body = await request.json();
  const { fatherId, type, labels, textFr, textEn, textNl, page, x, y, width, height } = body;

  // Validate type if provided
  if (type && !RECTANGLE_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${RECTANGLE_TYPES.join(", ")}` },
      { status: 400 }
    );
  }

  // Detect if geometry changed
  const geometryChanged =
    (x != null && x !== existing.x) ||
    (y != null && y !== existing.y) ||
    (width != null && width !== existing.width) ||
    (height != null && height !== existing.height) ||
    (page != null && page !== existing.page);

  // If position changed, check for overlaps
  if (x != null || y != null || width != null || height != null || page != null) {
    const newX = x ?? existing.x;
    const newY = y ?? existing.y;
    const newW = width ?? existing.width;
    const newH = height ?? existing.height;
    const newPage = page ?? existing.page;

    const siblings = await prisma.rectangle.findMany({
      where: {
        documentId: existing.documentId,
        page: newPage,
        id: { not: id },
      },
      select: { id: true, x: true, y: true, width: true, height: true },
    });

    const overlapping = siblings.find(
      (r) =>
        newX < r.x + r.width &&
        newX + newW > r.x &&
        newY < r.y + r.height &&
        newY + newH > r.y
    );

    if (overlapping) {
      return NextResponse.json(
        { error: `Rectangle would overlap with ${overlapping.id}.` },
        { status: 409 }
      );
    }
  }

  // Validate fatherId
  if (fatherId !== undefined) {
    if (fatherId === id) {
      return NextResponse.json(
        { error: "A rectangle cannot be its own parent." },
        { status: 400 }
      );
    }
    if (fatherId) {
      const father = await prisma.rectangle.findUnique({
        where: { id: fatherId },
        select: { documentId: true },
      });
      if (!father || father.documentId !== existing.documentId) {
        return NextResponse.json(
          { error: "Father rectangle not found in this document." },
          { status: 400 }
        );
      }
    }
  }

  // Build update data — only include fields that were provided
  const data: Record<string, unknown> = {};
  if (fatherId !== undefined) data.fatherId = fatherId || null;
  if (type !== undefined) data.type = type;
  if (labels !== undefined) data.labels = labels;
  if (textFr !== undefined) data.textFr = textFr;
  if (textEn !== undefined) data.textEn = textEn;
  if (textNl !== undefined) data.textNl = textNl;
  if (page !== undefined) data.page = page;
  if (x !== undefined) data.x = x;
  if (y !== undefined) data.y = y;
  if (width !== undefined) data.width = width;
  if (height !== undefined) data.height = height;

  // If geometry changed, re-extract text for the new area
  if (geometryChanged) {
    const finalPage = (page ?? existing.page) as number;
    const finalX = (x ?? existing.x) as number;
    const finalY = (y ?? existing.y) as number;
    const finalW = (width ?? existing.width) as number;
    const finalH = (height ?? existing.height) as number;

    const extractedText = await extractTextForZone(
      existing.document.pdfPath,
      finalPage, finalX, finalY, finalW, finalH,
    );

    // Only overwrite textFr if the caller didn't explicitly set it
    if (textFr === undefined) {
      data.textFr = extractedText;
    }
  }

  const updated = await prisma.rectangle.update({
    where: { id },
    data,
    include: {
      father: { select: { id: true, type: true, labels: true } },
      children: { select: { id: true, type: true, labels: true, page: true } },
    },
  });

  return NextResponse.json(updated);
}

// DELETE /api/rectangles/:id — delete a rectangle
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.rectangle.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Rectangle not found." }, { status: 404 });
  }
}
