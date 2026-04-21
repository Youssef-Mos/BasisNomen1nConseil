import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/filters — list all filters (optionally filtered by normId query param)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const normId = searchParams.get("normId");

  const where = normId ? { normId } : {};

  const filters = await prisma.normFilter.findMany({
    where,
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
    include: { norm: { select: { id: true, name: true } } },
  });

  return NextResponse.json(filters);
}

// POST /api/filters — create a new filter
export async function POST(request: NextRequest) {
  const body = await request.json();
  const { normId, key, label, section, type, options, sortOrder } = body;

  if (!key || !label || !section || !type) {
    return NextResponse.json(
      { error: "Fields key, label, section, type are required." },
      { status: 400 },
    );
  }

  const validTypes = ["select", "text", "multiselect", "boolean", "number", "range", "date"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  // If normId is provided, verify the norm exists
  const resolvedNormId: string | null = normId || null;
  if (resolvedNormId) {
    const norm = await prisma.norm.findUnique({ where: { id: resolvedNormId }, select: { id: true } });
    if (!norm) {
      return NextResponse.json({ error: "Norm not found." }, { status: 404 });
    }
  }

  // Check uniqueness of key within the scope (normId or global)
  const existing = await prisma.normFilter.findFirst({
    where: { normId: resolvedNormId, key },
  });
  if (existing) {
    return NextResponse.json(
      { error: `A filter with key "${key}" already exists${resolvedNormId ? " for this norm" : " globally"}.` },
      { status: 409 },
    );
  }

  const filter = await prisma.normFilter.create({
    data: {
      normId: resolvedNormId,
      key,
      label,
      section,
      type,
      options: Array.isArray(options) ? options : [],
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    },
    include: { norm: { select: { id: true, name: true } } },
  });

  return NextResponse.json(filter, { status: 201 });
}
