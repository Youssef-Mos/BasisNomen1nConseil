import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RECTANGLE_TYPES } from "@/lib/types";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/documents/:id/rectangles — all rectangles for a document
// Optional query: ?page=1 to filter by page
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const pageParam = searchParams.get("page");

  const where: { documentId: string; page?: number } = { documentId: id };
  if (pageParam) {
    const page = parseInt(pageParam, 10);
    if (!isNaN(page)) where.page = page;
  }

  const rectangles = await prisma.rectangle.findMany({
    where,
    orderBy: [{ page: "asc" }, { y: "asc" }, { x: "asc" }],
    include: {
      father: { select: { id: true, type: true, labels: true } },
      children: { select: { id: true, type: true, labels: true, page: true } },
    },
  });

  return NextResponse.json(rectangles);
}

// POST /api/documents/:id/rectangles — create a new rectangle
export async function POST(request: NextRequest, context: RouteContext) {
  const { id: documentId } = await context.params;

  // Verify document exists
  const doc = await prisma.document.findUnique({
    where: { id: documentId },
    select: { id: true },
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

  // Validate type if provided
  if (type && !RECTANGLE_TYPES.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${RECTANGLE_TYPES.join(", ")}` },
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

  return NextResponse.json(rectangle, { status: 201 });
}
