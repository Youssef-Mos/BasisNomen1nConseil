import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { RECTANGLE_TYPES } from "@/lib/types";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

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
// Query params:
//   keywords, topic, projectAddress, permitDate, buildingHeightType,
//   compartmentCategory, roomCategory,
//   pdfPage (filter by PDF page number),
//   page (pagination index), pageSize
export async function GET(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);

  const keywords = searchParams.get("keywords")?.trim();
  const topic = searchParams.get("topic")?.trim();
  const projectAddress = searchParams.get("projectAddress")?.trim();
  const permitDate = searchParams.get("permitDate")?.trim();
  const buildingHeightType = searchParams.get("buildingHeightType")?.trim();
  const compartmentCategory = searchParams.get("compartmentCategory")?.trim();
  const roomCategory = searchParams.get("roomCategory")?.trim();

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

  const textSearch = keywords || projectAddress || permitDate;
  if (textSearch) {
    filters.push({
      OR: [
        { textFr: { contains: textSearch, mode: "insensitive" } },
        { textEn: { contains: textSearch, mode: "insensitive" } },
        { textNl: { contains: textSearch, mode: "insensitive" } },
      ],
    });
  }

  // Label-driven filters use Prisma array queries to stay server-side.
  if (topic) filters.push({ labels: { has: topic } });
  if (buildingHeightType) filters.push({ labels: { has: buildingHeightType } });
  if (compartmentCategory) filters.push({ labels: { has: compartmentCategory } });
  if (roomCategory) filters.push({ labels: { has: roomCategory } });

  const where = filters.length ? { AND: filters } : { documentId: id };

  const [rectangles, total] = await Promise.all([
    prisma.rectangle.findMany({
      where,
      orderBy: [{ page: "asc" }, { y: "asc" }, { x: "asc" }],
      skip,
      take: pageSize,
      include: {
        father: { select: { id: true, type: true, labels: true } },
        children: { select: { id: true, type: true, labels: true, page: true } },
      },
    }),
    prisma.rectangle.count({ where }),
  ]);

  const hasMore = skip + rectangles.length < total;

  return NextResponse.json({
    items: rectangles,
    page,
    pageSize,
    total,
    hasMore,
  });
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
