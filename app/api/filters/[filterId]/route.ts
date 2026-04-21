import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ filterId: string }> };

// PUT /api/filters/:filterId — update a filter
export async function PUT(request: NextRequest, context: RouteContext) {
  const { filterId } = await context.params;

  const existing = await prisma.normFilter.findUnique({ where: { id: filterId } });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found." }, { status: 404 });
  }

  const body = await request.json();
  const { normId, key, label, section, type, options, sortOrder } = body;

  const validTypes = ["select", "text", "multiselect", "boolean", "number", "range", "date"];
  if (type !== undefined && !validTypes.includes(type)) {
    return NextResponse.json(
      { error: `Invalid type. Must be one of: ${validTypes.join(", ")}` },
      { status: 400 },
    );
  }

  // If normId is being changed, verify the new norm exists
  if (normId !== undefined && normId !== null && normId !== "") {
    const norm = await prisma.norm.findUnique({ where: { id: normId }, select: { id: true } });
    if (!norm) {
      return NextResponse.json({ error: "Norm not found." }, { status: 404 });
    }
  }

  const resolvedNormId = normId !== undefined ? (normId || null) : undefined;

  // If key or normId is changing, check uniqueness in the new scope
  const newKey = key ?? existing.key;
  const newNormId = resolvedNormId !== undefined ? resolvedNormId : existing.normId;
  if (newKey !== existing.key || newNormId !== existing.normId) {
    const duplicate = await prisma.normFilter.findFirst({
      where: { normId: newNormId, key: newKey, id: { not: filterId } },
    });
    if (duplicate) {
      return NextResponse.json(
        { error: `A filter with key "${newKey}" already exists in this scope.` },
        { status: 409 },
      );
    }
  }

  const filter = await prisma.normFilter.update({
    where: { id: filterId },
    data: {
      ...(resolvedNormId !== undefined && { normId: resolvedNormId }),
      ...(key !== undefined && { key }),
      ...(label !== undefined && { label }),
      ...(section !== undefined && { section }),
      ...(type !== undefined && { type }),
      ...(options !== undefined && { options: Array.isArray(options) ? options : [] }),
      ...(sortOrder !== undefined && { sortOrder }),
    },
    include: { norm: { select: { id: true, name: true } } },
  });

  return NextResponse.json(filter);
}

// DELETE /api/filters/:filterId — delete a filter
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { filterId } = await context.params;

  const existing = await prisma.normFilter.findUnique({ where: { id: filterId } });
  if (!existing) {
    return NextResponse.json({ error: "Filter not found." }, { status: 404 });
  }

  await prisma.normFilter.delete({ where: { id: filterId } });

  return NextResponse.json({ ok: true });
}
