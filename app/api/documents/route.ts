import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { PDFDocument } from "pdf-lib";
import { createHash } from "crypto";
import { writeFile, mkdir } from "fs/promises";
import { join } from "path";
import { execFile } from "child_process";
import { promisify } from "util";

const execFileAsync = promisify(execFile);

async function renderPagesForDocument(
  pdfPath: string,
  docId: string,
): Promise<void> {
  const pdfAbsPath = join(process.cwd(), pdfPath);
  const outputDir = join(process.cwd(), "public", "pdf-pages", docId);
  const scriptPath = join(process.cwd(), "python-pipeline", "render_pages.py");
  try {
    await execFileAsync(
      "python3",
      [scriptPath, pdfAbsPath, outputDir],
      { timeout: 300_000 }, // 5 min — large PDFs can be slow
    );
  } catch (err) {
    console.error(
      `Page rendering failed for doc ${docId}:`,
      err instanceof Error ? err.message : err,
    );
  }
}

// GET /api/documents — list all documents
export async function GET() {
  const documents = await prisma.document.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { rectangles: true } } },
  });

  const items = documents.map((doc) => ({
    id: doc.id,
    title: doc.title,
    pageCount: doc.pageCount,
    rectangleCount: doc._count.rectangles,
    createdAt: doc.createdAt.toISOString(),
  }));

  return NextResponse.json(items);
}

// POST /api/documents — upload a new PDF
export async function POST(request: NextRequest) {
  const formData = await request.formData();
  const file = formData.get("file") as File | null;
  const title = formData.get("title") as string | null;

  if (!file || !title) {
    return NextResponse.json(
      { error: "Both 'file' (PDF) and 'title' are required." },
      { status: 400 }
    );
  }

  if (file.type !== "application/pdf") {
    return NextResponse.json(
      { error: "File must be a PDF." },
      { status: 400 }
    );
  }

  const buffer = Buffer.from(await file.arrayBuffer());

  // Compute SHA-256 hash
  const fileHash = createHash("sha256").update(buffer).digest("hex");

  // Check for duplicate
  const existing = await prisma.document.findUnique({
    where: { fileHash },
  });
  if (existing) {
    return NextResponse.json(
      { error: `This PDF has already been uploaded as "${existing.title}".` },
      { status: 409 }
    );
  }

  // Extract page count
  let pageCount = 0;
  try {
    const pdfDoc = await PDFDocument.load(buffer);
    pageCount = pdfDoc.getPageCount();
  } catch {
    return NextResponse.json(
      { error: "Failed to parse PDF. The file may be corrupted." },
      { status: 400 }
    );
  }

  // Save file to uploads/pdfs/
  const uploadsDir = join(process.cwd(), "uploads", "pdfs");
  await mkdir(uploadsDir, { recursive: true });
  const fileName = `${fileHash}.pdf`;
  const filePath = join(uploadsDir, fileName);
  await writeFile(filePath, buffer);

  // Create document record
  const document = await prisma.document.create({
    data: {
      title,
      pdfPath: `uploads/pdfs/${fileName}`,
      fileHash,
      pageCount,
    },
  });

  // Render pages synchronously so the admin canvas can load them immediately.
  await renderPagesForDocument(document.pdfPath, document.id);

  return NextResponse.json(
    {
      id: document.id,
      title: document.title,
      pageCount: document.pageCount,
      rectangleCount: 0,
      createdAt: document.createdAt.toISOString(),
    },
    { status: 201 }
  );
}
