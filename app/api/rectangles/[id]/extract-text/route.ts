import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { execFile } from "child_process";
import { join } from "path";
import { existsSync } from "fs";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

function getPythonExecutable(): string {
  const venvUnix = join(process.cwd(), ".venv", "bin", "python3");
  if (existsSync(venvUnix)) return venvUnix;
  const venvWin = join(process.cwd(), ".venv", "Scripts", "python.exe");
  if (existsSync(venvWin)) return venvWin;
  return "python3";
}

type RouteContext = { params: Promise<{ id: string }> };

// POST /api/rectangles/:id/extract-text — re-extract text for a rectangle's current area
export async function POST(_request: NextRequest, context: RouteContext) {
  const { id } = await context.params;

  const rect = await prisma.rectangle.findUnique({
    where: { id },
    include: { document: { select: { pdfPath: true } } },
  });

  if (!rect) {
    return NextResponse.json({ error: "Rectangle not found." }, { status: 404 });
  }

  // Skip extraction for empty/tiny areas
  if (rect.width < 0.5 || rect.height < 0.5) {
    const updated = await prisma.rectangle.update({
      where: { id },
      data: { textFr: null },
    });
    return NextResponse.json({ text: null, rectangle: updated });
  }

  const pdfAbsPath = join(process.cwd(), rect.document.pdfPath);
  const scriptPath = join(process.cwd(), "python-pipeline", "extract_text_zone.py");

  let extractedText: string | null = null;

  try {
    const { stdout, stderr } = await execFileAsync(
      getPythonExecutable(),
      [
        scriptPath,
        pdfAbsPath,
        String(rect.page),
        String(rect.x),
        String(rect.y),
        String(rect.width),
        String(rect.height),
      ],
      { timeout: 15_000, maxBuffer: 2 * 1024 * 1024 },
    );

    if (stderr) {
      console.warn("extract_text_zone stderr:", stderr);
    }

    const parsed = JSON.parse(stdout);

    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 500 });
    }

    extractedText = parsed.text ?? null;
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Unknown error";
    console.error("Text extraction failed:", message);
    return NextResponse.json(
      { error: `Text extraction failed: ${message}` },
      { status: 500 },
    );
  }

  // Update the rectangle's textFr with the newly extracted text
  const updated = await prisma.rectangle.update({
    where: { id },
    data: { textFr: extractedText },
    include: {
      father: { select: { id: true, type: true, labels: true } },
      children: { select: { id: true, type: true, labels: true, page: true } },
    },
  });

  return NextResponse.json({ text: extractedText, rectangle: updated });
}
