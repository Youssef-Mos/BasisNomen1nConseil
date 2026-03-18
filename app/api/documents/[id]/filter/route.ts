/**
 * GET /api/documents/:id/filter?tags=tag1,tag2
 *
 * Filtre les articles d'un document selon une liste de tags.
 * Les enfants héritent des tags de leurs ancêtres :
 * un article est retenu si ses tags effectifs (propres + hérités) contiennent
 * TOUS les tags sélectionnés.
 *
 * Query params :
 *   tags — liste de tags séparés par des virgules (au moins 1)
 *
 * Réponse : FilterResponse
 */

import { prisma } from "@/lib/prisma"
import { ok, notFound, badRequest, serverError } from "@/lib/api"
import type { FilterResponse, FilterResultItem } from "@/lib/types"

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params
    const { searchParams } = new URL(request.url)

    const tagsParam   = searchParams.get("tags") ?? ""
    const selectedTags = tagsParam
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean)

    if (selectedTags.length === 0) {
      return badRequest("Au moins un tag est requis.")
    }

    // Vérifier que le document existe
    const document = await prisma.document.findUnique({
      where:  { id },
      select: { id: true },
    })
    if (!document) return notFound("Document introuvable")

    // Charger tous les articles avec leurs tags et leur première zone (aperçu)
    const articles = await prisma.article.findMany({
      where:   { documentId: id },
      select: {
        id:        true,
        parentId:  true,
        title:     true,
        slug:      true,
        pageStart: true,
        tags:      true,
        zones: {
          orderBy: { page: "asc" },
          take:    1,
          select:  { imagePath: true },
        },
      },
    })

    // ── Héritage des tags parent → enfant ───────────────────────────────────

    const articleMap = new Map(articles.map((a) => [a.id, a]))

    /** Retourne les tags propres + ceux de tous les ancêtres (récursif). */
    const getEffectiveTags = (articleId: string, visited = new Set<string>()): string[] => {
      if (visited.has(articleId)) return []
      visited.add(articleId)

      const article = articleMap.get(articleId)
      if (!article) return []

      const parentTags = article.parentId
        ? getEffectiveTags(article.parentId, visited)
        : []

      return [...article.tags.map((t) => t.toLowerCase()), ...parentTags]
    }

    // ── Filtrage ─────────────────────────────────────────────────────────────

    const matching = articles.filter((article) => {
      const effectiveTags = getEffectiveTags(article.id)
      return selectedTags.every((tag) => effectiveTags.includes(tag))
    })

    const results: FilterResultItem[] = matching.map((article) => ({
      articleId:        article.id,
      articleTitle:     article.title,
      articleSlug:      article.slug,
      articlePage:      article.pageStart,
      previewImagePath: article.zones[0]?.imagePath ?? null,
    }))

    // Trier par page pour un affichage ordonné
    results.sort((a, b) => a.articlePage - b.articlePage)

    const response: FilterResponse = {
      tags:    selectedTags,
      total:   results.length,
      results,
    }

    return ok(response)
  } catch {
    return serverError()
  }
}
