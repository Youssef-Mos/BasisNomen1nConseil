/**
 * GET /api/articles/:id
 *
 * Retourne le détail complet d'un article :
 * - parent direct
 * - enfants directs (pour navigation)
 * - zones visuelles PDF avec leur texte OCR
 *
 * Les zones permettent d'afficher les extraits visuels dans l'interface.
 * Le texte OCR (ocrText) est inclus pour le surlignage côté client
 * mais ne remplace jamais l'affichage de l'image (imagePath).
 *
 * Réponse : ArticleDetail
 */

import { prisma } from "@/lib/prisma"
import { ok, notFound, serverError } from "@/lib/api"
import type { ArticleDetail } from "@/lib/types"

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const { id } = await params

    const article = await prisma.article.findUnique({
      where: { id },
      select: {
        id:         true,
        documentId: true,
        parentId:   true,
        title:      true,
        slug:       true,
        level:      true,
        orderIndex: true,
        pageStart:  true,
        pageEnd:    true,

        parent: {
          select: { id: true, title: true, slug: true, level: true },
        },

        children: {
          orderBy: { orderIndex: "asc" },
          select:  { id: true, title: true, slug: true, orderIndex: true },
        },

        zones: {
          orderBy: { page: "asc" },
          select: {
            id:        true,
            page:      true,
            x:         true,
            y:         true,
            width:     true,
            height:    true,
            imagePath: true,
            ocrText: {
              select: { id: true, text: true },
            },
          },
        },
      },
    })

    if (!article) return notFound("Article introuvable")

    const result: ArticleDetail = {
      id:         article.id,
      documentId: article.documentId,
      parentId:   article.parentId,
      title:      article.title,
      slug:       article.slug,
      level:      article.level,
      orderIndex: article.orderIndex,
      pageStart:  article.pageStart,
      pageEnd:    article.pageEnd,
      parent:     article.parent,
      children:   article.children,
      zones:      article.zones,
    }

    return ok(result)
  } catch {
    return serverError()
  }
}
