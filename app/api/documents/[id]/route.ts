/**
 * GET /api/documents/:id
 *
 * Retourne les métadonnées complètes d'un document.
 *
 * Réponse : DocumentDetail
 */

import { prisma } from "@/lib/prisma"
import { ok, notFound, serverError } from "@/lib/api"
import type { DocumentDetail } from "@/lib/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const [document, stats] = await Promise.all([
      prisma.document.findUnique({
        where:  { id },
        select: {
          id:        true,
          title:     true,
          pdfPath:   true,
          language:  true,
          version:   true,
          createdAt: true,
          updatedAt: true,
        },
      }),

      prisma.article.aggregate({
        where:  { documentId: id },
        _count: { _all: true },
        _max:   { pageStart: true },
      }),
    ])

    if (!document) return notFound("Document introuvable")

    const result: DocumentDetail = {
      id:           document.id,
      title:        document.title,
      pdfPath:      document.pdfPath,
      language:     document.language,
      version:      document.version,
      articleCount: stats._count._all       ?? 0,
      pageCount:    stats._max.pageStart    ?? 0,
      createdAt:    document.createdAt.toISOString(),
      updatedAt:    document.updatedAt.toISOString(),
    }

    return ok(result)
  } catch {
    return serverError()
  }
}
