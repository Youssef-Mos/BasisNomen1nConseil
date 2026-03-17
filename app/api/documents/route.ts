/**
 * GET /api/documents
 *
 * Retourne la liste paginée des documents disponibles.
 *
 * Query params :
 *   page     (défaut 1)
 *   pageSize (défaut 20, max 100)
 *
 * Réponse : DocumentListItem[]
 */

import { prisma } from "@/lib/prisma"
import { ok, serverError } from "@/lib/api"
import { paginationSchema } from "@/lib/validators"
import type { DocumentListItem } from "@/lib/types"

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const { page, pageSize } = paginationSchema.parse({
      page:     searchParams.get("page")     ?? undefined,
      pageSize: searchParams.get("pageSize") ?? undefined,
    })

    const [documents, articleStats] = await Promise.all([
      prisma.document.findMany({
        orderBy: { createdAt: "desc" },
        skip:    (page - 1) * pageSize,
        take:    pageSize,
        select: {
          id:        true,
          title:     true,
          language:  true,
          version:   true,
          createdAt: true,
        },
      }),

      // articleCount + pageCount (max pageStart) en une seule passe
      prisma.article.groupBy({
        by:   ["documentId"],
        _count: { _all: true },
        _max:   { pageStart: true },
      }),
    ])

    const statsMap = new Map(articleStats.map((s) => [s.documentId, s]))

    const result: DocumentListItem[] = documents.map((doc) => {
      const stats = statsMap.get(doc.id)
      return {
        id:           doc.id,
        title:        doc.title,
        language:     doc.language,
        version:      doc.version,
        articleCount: stats?._count._all   ?? 0,
        pageCount:    stats?._max.pageStart ?? 0,
        createdAt:    doc.createdAt.toISOString(),
      }
    })

    return ok(result)
  } catch {
    return serverError()
  }
}
