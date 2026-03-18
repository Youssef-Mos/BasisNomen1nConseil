/**
 * GET /api/documents/:id/search?q=query
 *
 * Recherche dans les textes OCR des zones d'un document donné.
 * La recherche est insensible à la casse et ne se déclenche jamais
 * automatiquement — uniquement sur action explicite de l'utilisateur.
 *
 * Query params :
 *   q  — la requête (2 caractères minimum)
 *
 * Réponse : SearchResponse
 */

import { prisma } from "@/lib/prisma"
import { ok, notFound, badRequest, serverError } from "@/lib/api"
import type { SearchResponse, SearchResultItem } from "@/lib/types"

/** Construit un extrait du texte OCR centré sur la première occurrence de la requête. */
function buildExcerpt(text: string, query: string, contextLen = 80): string {
  const lower = text.toLowerCase()
  const idx   = lower.indexOf(query.toLowerCase())
  if (idx === -1) return text.slice(0, contextLen * 2)

  const start   = Math.max(0, idx - contextLen)
  const end     = Math.min(text.length, idx + query.length + contextLen)
  let   excerpt = text.slice(start, end)

  if (start > 0)            excerpt = "…" + excerpt
  if (end < text.length)    excerpt = excerpt + "…"

  return excerpt
}

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id }   = await params
    const { searchParams } = new URL(request.url)
    const query    = (searchParams.get("q") ?? "").trim()

    if (query.length < 2) {
      return badRequest("La requête doit comporter au moins 2 caractères.")
    }

    // Vérifier que le document existe
    const document = await prisma.document.findUnique({
      where:  { id },
      select: { id: true },
    })
    if (!document) return notFound("Document introuvable")

    // Recherche insensible à la casse dans les textes OCR du document
    const zones = await prisma.pdfZone.findMany({
      where: {
        article: { documentId: id },
        ocrText: {
          text: { contains: query, mode: "insensitive" },
        },
      },
      select: {
        id:        true,
        page:      true,
        imagePath: true,
        ocrText: { select: { text: true } },
        article: {
          select: {
            id:        true,
            title:     true,
            slug:      true,
            pageStart: true,
          },
        },
      },
      orderBy: [
        { article: { pageStart: "asc" } },
        { page: "asc" },
      ],
    })

    const results: SearchResultItem[] = zones.map((zone) => ({
      articleId:    zone.article.id,
      articleTitle: zone.article.title,
      articleSlug:  zone.article.slug,
      articlePage:  zone.article.pageStart,
      zoneId:       zone.id,
      zonePage:     zone.page,
      imagePath:    zone.imagePath,
      excerpt:      buildExcerpt(zone.ocrText?.text ?? "", query),
    }))

    const response: SearchResponse = {
      query,
      total:   results.length,
      results,
    }

    return ok(response)
  } catch {
    return serverError()
  }
}
