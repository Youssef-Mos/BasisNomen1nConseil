import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { readFile } from "fs/promises";
import { join } from "path";

type RouteContext = { params: Promise<{ id: string }> };

// GET /api/documents/:id/pdf — serve the PDF file
export async function GET(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { pdfPath: true, title: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  try {
    const filePath = join(process.cwd(), doc.pdfPath);
    const buffer = await readFile(filePath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="${encodeURIComponent(doc.title)}.pdf"`,
        "Cache-Control": "private, max-age=86400",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "PDF file not found on disk." },
      { status: 404 }
    );
  }
}
