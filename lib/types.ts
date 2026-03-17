/**
 * lib/types.ts — Shapes des réponses API.
 *
 * Ces types sont partagés entre les route handlers (côté serveur)
 * et les pages/composants Next.js (côté client via fetch).
 */

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

export type DocumentListItem = {
  id: string
  title: string
  language: string
  version: string | null
  articleCount: number
  /** Numéro de la dernière page détectée dans les articles du document. */
  pageCount: number
  createdAt: string
}

export type DocumentDetail = DocumentListItem & {
  pdfPath: string
  updatedAt: string
}

// ---------------------------------------------------------------------------
// Tree (hiérarchie d'articles)
// ---------------------------------------------------------------------------

export type ArticleTreeNode = {
  id: string
  title: string | null
  slug: string
  level: number
  orderIndex: number
  pageStart: number
  pageEnd: number | null
  /** True si cet article a au moins une PdfZone associée. */
  hasZones: boolean
  children: ArticleTreeNode[]
}

// ---------------------------------------------------------------------------
// Article
// ---------------------------------------------------------------------------

export type ArticleDetail = {
  id: string
  documentId: string
  parentId: string | null
  title: string | null
  slug: string
  level: number
  orderIndex: number
  pageStart: number
  pageEnd: number | null
  parent: { id: string; title: string | null; slug: string; level: number } | null
  children: { id: string; title: string | null; slug: string; orderIndex: number }[]
  zones: ZoneWithOcr[]
}

export type ZoneWithOcr = {
  id: string
  page: number
  x: number
  y: number
  width: number
  height: number
  imagePath: string
  /** Texte OCR — pour recherche / surlignage uniquement, jamais affiché comme contenu. */
  ocrText: { id: string; text: string } | null
}

// ---------------------------------------------------------------------------
// Recherche
// ---------------------------------------------------------------------------

export type SearchResultItem = {
  articleId: string
  articleTitle: string | null
  articleSlug: string
  articlePage: number
  zoneId: string
  zonePage: number
  imagePath: string
  /** Fragment du texte OCR autour de la correspondance. */
  excerpt: string
}

export type SearchResponse = {
  query: string
  total: number
  results: SearchResultItem[]
}

// ---------------------------------------------------------------------------
// Erreurs
// ---------------------------------------------------------------------------

export type ApiError = {
  error: string
}
