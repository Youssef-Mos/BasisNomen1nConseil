import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/documents/:id — document details
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const doc = await prisma.document.findUnique({
    where: { id },
    include: { _count: { select: { rectangles: true } } },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  return NextResponse.json({
    id: doc.id,
    title: doc.title,
    pdfPath: doc.pdfPath,
    pageCount: doc.pageCount,
    rectangleCount: doc._count.rectangles,
    createdAt: doc.createdAt.toISOString(),
    updatedAt: doc.updatedAt.toISOString(),
  });
}

// DELETE /api/documents/:id — delete a document (cascades to rectangles)
export async function DELETE(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  try {
    await prisma.document.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }
}
