import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ normId: string; filterId: string }> };

// PUT /api/norms/:normId/filters/:filterId — update a filter
export async function PUT(request: NextRequest, context: RouteContext) {
  const { normId, filterId } = await context.params;

  const existing = await prisma.normFilter.findFirst({
    where: { id: filterId, normId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found." }, { status: 404 });
  }

  const body = await request.json();
  const { key, label, section, type, options, sortOrder } = body;

  const validTypes = ["select", "text", "multiselect", "boolean"];
  if (type !== undefined && !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  // If key is being changed, check uniqueness
  if (key && key !== existing.key) {
    const duplicate = await prisma.normFilter.findUnique({
      where: { normId_key: { normId, key } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `A filter with key "${key}" already exists for this norm.` },
        { status: 409 },
      );
    }
  }

  const filter = await prisma.normFilter.update({
    where: { id: filterId },
    data: {
      ...(key !== undefined && { key }),
      ...(label !== undefined && { label }),
      ...(section !== undefined && { section }),
      ...(type !== undefined && { type }),
      ...(options !== undefined && { options: Array.isArray(options) ? options : [] }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
  });

  return NextResponse.json(filter);
}

// DELETE /api/norms/:normId/filters/:filterId — delete a filter
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { normId, filterId } = await context.params;

  const existing = await prisma.normFilter.findFirst({
    where: { id: filterId, normId },
  });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found." }, { status: 404 });
  }

  await prisma.normFilter.delete({ where: { id: filterId } });

  return NextResponse.json({ ok: true });
}
