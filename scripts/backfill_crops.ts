/**
 * backfill_crops.ts
 *
 * Repairs all documents that are missing page PNGs and/or crop PNGs.
 *
 * Steps:
 *   1. For each document, check if public/pdf-pages/{docId}/page-001.png exists.
 *      If not, run render_pages.py to render all pages.
 *   2. For each rectangle, check if public/pdf-pages/{docId}/crops/{rectId}.png exists.
 *      If not, run crop_rectangle.py to generate it.
 *
 * Usage:
 *   npx tsx scripts/backfill_crops.ts
 */

import { PrismaClient } from "@prisma/client";
import { execFile } from "child_process";
import { join } from "path";
import { promisify } from "util";
import fs from "fs";

const execFileAsync = promisify(execFile);
const prisma = new PrismaClient();

async function renderPages(pdfAbsPath: string, outputDir: string, docId: string): Promise<boolean> {
  const scriptPath = join(process.cwd(), "python-pipeline", "render_pages.py");
  try {
    const { stdout } = await execFileAsync(
      "python3",
      [scriptPath, pdfAbsPath, outputDir],
      { timeout: 300_000 },
    );
    const result = JSON.parse(stdout);
    if (result.error) {
      console.error(`  Page render error for ${docId}: ${result.error}`);
      return false;
    }
    console.log(`  Rendered ${result.pages} pages for doc ${docId}`);
    return true;
  } catch (err) {
    console.error(`  Page render failed for ${docId}:`, err instanceof Error ? err.message : err);
    return false;
  }
}

async function main() {
  const documents = await prisma.document.findMany({
    select: {
      id: true,
      title: true,
      pdfPath: true,
      pageCount: true,
    },
  });

  console.log(`\nFound ${documents.length} document(s).\n`);

  let totalCropsGenerated = 0;
  let totalCropErrors = 0;
  let totalPagesRendered = 0;

  const cropScript = join(process.cwd(), "python-pipeline", "crop_rectangle.py");

  for (const doc of documents) {
    console.log(`\n── Document: "${doc.title}" (${doc.id})`);

    const pdfAbsPath = join(process.cwd(), doc.pdfPath);
    if (!fs.existsSync(pdfAbsPath)) {
      console.warn(`  PDF not found at ${pdfAbsPath}, skipping.`);
      continue;
    }

    const pagesDir = join(process.cwd(), "public", "pdf-pages", doc.id);
    const page1 = join(pagesDir, "page-001.png");

    // ── Step 1: Render pages if missing ────────────────────────────────────
    if (!fs.existsSync(page1)) {
      console.log(`  Page PNGs missing. Rendering ${doc.pageCount} pages…`);
      const ok = await renderPages(pdfAbsPath, pagesDir, doc.id);
      if (ok) totalPagesRendered += doc.pageCount;
    } else {
      console.log(`  Page PNGs already present, skipping render.`);
    }

    // ── Step 2: Generate missing crops ─────────────────────────────────────
    const rectangles = await prisma.rectangle.findMany({
      where: { documentId: doc.id },
      select: { id: true, page: true, x: true, y: true, width: true, height: true },
    });

    const missing = rectangles.filter((r) => {
      const cropPath = join(pagesDir, "crops", `${r.id}.png`);
      return !fs.existsSync(cropPath);
    });

    console.log(`  ${rectangles.length} rectangles total, ${missing.length} crops missing.`);

    let docCrops = 0;
    for (let i = 0; i < missing.length; i++) {
      const rect = missing[i];
      if (rect.width < 0.1 || rect.height < 0.1) continue;

      const outputPath = join(pagesDir, "crops", `${rect.id}.png`);
      try {
        await execFileAsync(
          "python3",
          [cropScript, pdfAbsPath, String(rect.page), String(rect.x), String(rect.y), String(rect.width), String(rect.height), outputPath],
          { timeout: 30_000 },
        );
        docCrops++;
        totalCropsGenerated++;
        if (docCrops % 50 === 0) {
          console.log(`  … ${docCrops}/${missing.length} crops done`);
        }
      } catch (err) {
        console.error(`  Crop failed for rect ${rect.id}:`, err instanceof Error ? err.message : err);
        totalCropErrors++;
      }
    }

    if (missing.length > 0) {
      console.log(`  Done: ${docCrops} crops generated, ${totalCropErrors} errors.`);
    }
  }

  console.log(`\n──────────────────────────────────────`);
  console.log(`Backfill complete.`);
  console.log(`  Pages rendered : ${totalPagesRendered}`);
  console.log(`  Crops generated: ${totalCropsGenerated}`);
  console.log(`  Crop errors    : ${totalCropErrors}`);
  console.log(`──────────────────────────────────────\n`);

  await prisma.$disconnect();
}

main().catch((e) => {
  console.error(e);
  prisma.$disconnect();
  process.exit(1);
});
