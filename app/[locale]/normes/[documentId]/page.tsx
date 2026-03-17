/**
 * /normes/[documentId] — Explorateur structuré d'un document.
 * Server Component — charge l'arbre depuis Prisma, délègue l'interactivité à DocsLayout.
 */

import { notFound } from "next/navigation"
import { prisma } from "@/lib/prisma"
import { DocsLayout } from "@/components/normes/DocsLayout"
import type { ArticleTreeNode } from "@/lib/types"

export const dynamic = "force-dynamic"

// ---------------------------------------------------------------------------
// Helper : flat list → arbre imbriqué
// ---------------------------------------------------------------------------

type FlatArticle = {
  id: string
  parentId: string | null
  title: string | null
  slug: string
  level: number
  orderIndex: number
  pageStart: number
  pageEnd: number | null
  _count: { zones: number }
}

function buildTree(articles: FlatArticle[], parentId: string | null = null): ArticleTreeNode[] {
  return articles
    .filter((a) => a.parentId === parentId)
    .sort((a, b) => a.orderIndex - b.orderIndex)
    .map((a) => ({
      id:         a.id,
      title:      a.title,
      slug:       a.slug,
      level:      a.level,
      orderIndex: a.orderIndex,
      pageStart:  a.pageStart,
      pageEnd:    a.pageEnd,
      hasZones:   a._count.zones > 0,
      children:   buildTree(articles, a.id),
    }))
}

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default async function DocumentPage({
  params,
}: {
  params: Promise<{ locale: string; documentId: string }>
}) {
  const { documentId } = await params

  const [doc, articles] = await Promise.all([
    prisma.document.findUnique({
      where: { id: documentId },
      select: { id: true, title: true, language: true, version: true },
    }),
    prisma.article.findMany({
      where: { documentId },
      orderBy: [{ level: "asc" }, { orderIndex: "asc" }],
      select: {
        id:         true,
        parentId:   true,
        title:      true,
        slug:       true,
        level:      true,
        orderIndex: true,
        pageStart:  true,
        pageEnd:    true,
        _count: { select: { zones: true } },
      },
    }),
  ])

  if (!doc) notFound()

  const tree = buildTree(articles)

  return (
    <DocsLayout
      documentId={documentId}
      documentTitle={doc.title}
      tree={tree}
    />
  )
}
