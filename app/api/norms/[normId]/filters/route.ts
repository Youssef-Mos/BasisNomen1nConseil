import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ normId: string }> };

// GET /api/norms/:normId/filters — list all filters for a norm
export async function GET(_request: NextRequest, context: RouteContext) {
  const { normId } = await context.params;

  const filters = await prisma.normFilter.findMany({
    where: { normId },
    orderBy: { sortOrder: "asc" },
  });

  return NextResponse.json(filters);
}

// POST /api/norms/:normId/filters — create a new filter
export async function POST(request: NextRequest, context: RouteContext) {
  const { normId } = await context.params;

  // Verify norm exists
  const norm = await prisma.norm.findUnique({ where: { id: normId }, select: { id: true } });
  if (!norm) {
    return NextResponse.json({ error: "Norm not found." }, { status: 404 });
  }

  const body = await request.json();
  const { key, label, section, type, options, sortOrder } = body;

  if (!key || !label || !section || !type) {
    return NextResponse.json(
      { error: "Fields key, label, section, type are required." },
      { status: 400 },
    );
  }

  const validTypes = ["select", "text", "multiselect", "boolean"];
  if (!validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  // Check uniqueness of key within norm
  const existing = await prisma.normFilter.findUnique({
    where: { normId_key: { normId, key } },
  });
  if (existing) {
    return NextResponse.json(
      { error: `A filter with key "${key}" already exists for this norm.` },
      { status: 409 },
    );
  }

  const filter = await prisma.normFilter.create({
    data: {
      normId,
      key,
      label,
      section,
      type,
      options: Array.isArray(options) ? options : [],
      sortOrder: typeof sortOrder === "number" ? sortOrder : 0,
    },
  });

  return NextResponse.json(filter, { status: 201 });
}
