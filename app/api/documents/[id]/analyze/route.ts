import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";
import fs from "fs";

const execFileAsync = promisify(execFile);

type RouteContext = { params: Promise<{ id: string }> };

type AnalyzedNode = {
  index: number;
  parentIndex: number | null;
  page: number;
  x: number;
  y: number;
  width: number;
  height: number;
  type: string;
  text: string;
};

const VALID_TYPES = new Set([
  "phrase", "paragraph", "article", "section",
  "figure", "table", "formula", "annexe",
]);

// POST /api/documents/:id/analyze — run smart hierarchical analysis on the PDF
// Query: ?clear=true to delete existing rectangles first
export async function POST(request: NextRequest, context: RouteContext) {
  const { id } = await context.params;
  const { searchParams } = new URL(request.url);
  const clearExisting = searchParams.get("clear") === "true";

  const doc = await prisma.document.findUnique({
    where: { id },
    select: { id: true, pdfPath: true },
  });

  if (!doc) {
    return NextResponse.json({ error: "Document not found." }, { status: 404 });
  }

  const pdfAbsPath = join(process.cwd(), doc.pdfPath);
  const scriptPath = join(process.cwd(), "python-pipeline", "smart_analyze.py");

  // Run the Python smart analysis script
  let nodes: AnalyzedNode[];
  try {
    const { stdout, stderr } = await execFileAsync("python3", [scriptPath, pdfAbsPath], {
      timeout: 120_000,
      maxBuffer: 20 * 1024 * 1024, // 20 MB
    });

    if (stderr) {
      console.warn("Python stderr:", stderr);
    }

    const parsed = JSON.parse(stdout);

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 500 });
    }

    nodes = parsed.nodes;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Analysis failed:", message);
    return NextResponse.json(
      { error: `Analysis failed: ${message}. Make sure Python 3 and PyMuPDF are installed.` },
      { status: 500 }
    );
  }

  if (!Array.isArray(nodes) || nodes.length === 0) {
    return NextResponse.json(
      { error: "No text blocks detected in the PDF." },
      { status: 422 }
    );
  }

  // Clear existing rectangles if requested
  if (clearExisting) {
    await prisma.rectangle.deleteMany({ where: { documentId: id } });
  }

  // Create rectangles with hierarchy (fatherId) in a transaction.
  // Nodes are ordered so parents always come before children.
  type PrismaRectType = "phrase" | "paragraph" | "article" | "section" | "figure" | "table" | "formula" | "annexe";

  const indexToId = new Map<number, string>();

  await prisma.$transaction(
    async (tx) => {
      for (const node of nodes) {
        const fatherId = node.parentIndex !== null
          ? indexToId.get(node.parentIndex) ?? null
          : null;

        const rect = await tx.rectangle.create({
          data: {
            documentId: id,
            page: node.page,
            x: node.x,
            y: node.y,
            width: node.width,
            height: node.height,
            type: (VALID_TYPES.has(node.type) ? node.type : "paragraph") as PrismaRectType,
            labels: [],
            textFr: node.text || null,
            fatherId,
          },
          select: { id: true },
        });

        indexToId.set(node.index, rect.id);
      }
    },
    { timeout: 120_000 }
  );

  // Fetch the newly created rectangles to return them
  const rectangles = await prisma.rectangle.findMany({
    where: { documentId: id },
    orderBy: [{ page: "asc" }, { y: "asc" }],
  });

  // Fire-and-forget crop generation — do not await, response is already sent below.
  // This runs in the background after the response is delivered.
  void (async () => {
    const cropScript = join(process.cwd(), "python-pipeline", "crop_rectangle.py");
    const pdfAbsPath = join(process.cwd(), doc.pdfPath);

    // Also render pages if they are missing (e.g. doc was uploaded without rendering).
    const pagesDir = join(process.cwd(), "public", "pdf-pages", id);
    const page1 = join(pagesDir, "page-001.png");
    if (!fs.existsSync(page1)) {
      const renderScript = join(process.cwd(), "python-pipeline", "render_pages.py");
      try {
        await execFileAsync("python3", [renderScript, pdfAbsPath, pagesDir], { timeout: 300_000 });
      } catch (err) {
        console.error("Background page render failed:", err instanceof Error ? err.message : err);
      }
    }

    for (const rect of rectangles) {
      if (rect.width < 0.1 || rect.height < 0.1) continue;
      const outputPath = join(pagesDir, "crops", `${rect.id}.png`);
      try {
        await execFileAsync(
          "python3",
          [cropScript, pdfAbsPath, String(rect.page), String(rect.x), String(rect.y), String(rect.width), String(rect.height), outputPath],
          { timeout: 30_000 },
        );
      } catch (err) {
        console.error(`Background crop failed for ${rect.id}:`, err instanceof Error ? err.message : err);
      }
    }
    console.log(`Background crop generation finished for doc ${id}: ${rectangles.length} rects.`);
  })();

  return NextResponse.json({
    created: indexToId.size,
    total: rectangles.length,
    rectangles,
  });
}
