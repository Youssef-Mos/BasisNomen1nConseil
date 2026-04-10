import { NextRequest } from "next/server";
import path from "path";
import fs from "fs/promises";
import { prisma } from "@/lib/prisma";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ rectId: string }> }
) {
  const { rectId } = await params;

  // 1. Valider le rectId — éviter path traversal
  if (!/^[a-zA-Z0-9_-]+$/.test(rectId)) {
    return new Response("Invalid id", { status: 400 });
  }

  // 2. Vérifier que le rectangle existe en base (bloque l'énumération)
  const rect = await prisma.rectangle.findUnique({
    where: { id: rectId },
    select: { id: true, documentId: true },
  });
  if (!rect) return new Response("Not found", { status: 404 });

  // 3. Construire le chemin fichier (jamais depuis un input utilisateur)
  const filePath = path.join(
    process.cwd(),
    "public",
    "pdf-pages",
    rect.documentId,
    "crops",
    `${rectId}.png`
  );

  // 4. Lire le fichier
  let fileBuffer: Buffer;
  try {
    fileBuffer = await fs.readFile(filePath);
  } catch {
    return new Response("Image not ready", { status: 404 });
  }

  // 5. Streamer avec headers de protection
  return new Response(new Uint8Array(fileBuffer), {
    status: 200,
    headers: {
      "Content-Type": "image/png",
      "Cache-Control": "no-store, no-cache, must-revalidate",
      "Content-Disposition": 'inline; filename="protected.png"',
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "SAMEORIGIN",
    },
  });
}
