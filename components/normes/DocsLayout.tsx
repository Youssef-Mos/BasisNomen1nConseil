/**
 * DocsLayout — Layout principal de l'explorateur de document.
 * Client Component : gère l'état global (accordéons ouverts, recherche, article actif).
 *
 * Reçoit l'arbre d'articles depuis le Server Component parent.
 * Toute l'interactivité (sidebar, accordéon, recherche) est coordonnée ici.
 */

"use client"

import { useState, useCallback } from "react"
import type { ArticleTreeNode, SearchResultItem } from "@/lib/types"
import { DocsSidebar } from "./DocsSidebar"
import { ArticleAccordion } from "./ArticleAccordion"
import { SearchBar } from "./SearchBar"

interface DocsLayoutProps {
  documentId: string
  documentTitle: string
  tree: ArticleTreeNode[]
}

// ---------------------------------------------------------------------------
// Helpers arbre
// ---------------------------------------------------------------------------

/** Collecte l'id du nœud et de tous ses descendants. */
function collectDescendants(node: ArticleTreeNode): string[] {
  return [node.id, ...node.children.flatMap(collectDescendants)]
}

/** Retourne le chemin [racine → cible] ou null si introuvable. */
function findPath(tree: ArticleTreeNode[], targetId: string): string[] | null {
  for (const node of tree) {
    if (node.id === targetId) return [node.id]
    const sub = findPath(node.children, targetId)
    if (sub) return [node.id, ...sub]
  }
  return null
}

/** Trouve un nœud par id dans l'arbre. */
function findNode(tree: ArticleTreeNode[], id: string): ArticleTreeNode | null {
  for (const node of tree) {
    if (node.id === id) return node
    const sub = findNode(node.children, id)
    if (sub) return sub
  }
  return null
}

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export function DocsLayout({ documentId, documentTitle, tree }: DocsLayoutProps) {
  /** IDs des accordéons actuellement ouverts. */
  const [openIds, setOpenIds] = useState<Set<string>>(new Set())

  /** Article mis en évidence dans la sidebar (clic sidebar ou résultat de recherche). */
  const [activeId, setActiveId] = useState<string | null>(null)

  /** IDs des articles contenant des résultats de recherche (null = pas de recherche active). */
  const [matchingIds, setMatchingIds] = useState<Set<string> | null>(null)

  // ── Résultats de recherche ─────────────────────────────────────────────

  const handleSearchResults = useCallback(
    (results: SearchResultItem[] | null) => {
      if (!results) {
        setMatchingIds(null)
        return
      }
      const ids = new Set(results.map((r) => r.articleId))
      setMatchingIds(ids)

      // Ouvrir tous les articles correspondants (et leurs ancêtres)
      setOpenIds((prev) => {
        const next = new Set(prev)
        for (const id of ids) {
          const path = findPath(tree, id)
          if (path) path.forEach((p) => next.add(p))
        }
        return next
      })
    },
    [tree],
  )

  // ── Clic sidebar ──────────────────────────────────────────────────────

  const handleSidebarSelect = useCallback(
    (id: string) => {
      setActiveId(id)

      // Ouvrir l'article et tous ses ancêtres
      setOpenIds((prev) => {
        const next = new Set(prev)
        const path = findPath(tree, id)
        if (path) path.forEach((p) => next.add(p))
        return next
      })

      // Scroll vers l'article après le prochain render
      setTimeout(
        () =>
          document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" }),
        60,
      )
    },
    [tree],
  )

  // ── Toggle accordéon ─────────────────────────────────────────────────

  const handleToggle = useCallback(
    (id: string) => {
      const node = findNode(tree, id)
      if (!node) return

      setOpenIds((prev) => {
        const next = new Set(prev)
        if (next.has(id)) {
          // Fermer ce nœud et tous ses descendants
          collectDescendants(node).forEach((d) => next.delete(d))
        } else {
          next.add(id)
        }
        return next
      })
    },
    [tree],
  )

  // ── Rendu ─────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">

      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="hidden w-[280px] shrink-0 flex-col overflow-hidden border-r border-gray-200 bg-white lg:flex">
        {/* En-tête sidebar */}
        <div className="shrink-0 border-b border-gray-100 px-4 py-4">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
            Table des matières
          </p>
          <h2 className="mt-1 text-sm font-semibold leading-snug text-slate-700">
            {documentTitle}
          </h2>
        </div>

        {/* Arbre scrollable */}
        <div className="flex-1 overflow-y-auto">
          <DocsSidebar
            tree={tree}
            activeId={activeId}
            matchingIds={matchingIds}
            onSelect={handleSidebarSelect}
          />
        </div>
      </aside>

      {/* ── Contenu principal ─────────────────────────────────────────── */}
      <main className="flex flex-1 flex-col overflow-hidden">
        {/* Barre de recherche */}
        <div className="shrink-0 border-b border-gray-200 bg-white px-6 py-3">
          <SearchBar documentId={documentId} onResults={handleSearchResults} />
        </div>

        {/* Articles */}
        <div className="flex-1 overflow-y-auto px-4 py-6 lg:px-10">
          <div className="mx-auto max-w-5xl space-y-2">
            {tree.length === 0 ? (
              <p className="py-16 text-center text-sm text-slate-400">
                Aucun article détecté dans ce document.
              </p>
            ) : (
              tree.map((node) => (
                <ArticleAccordion
                  key={node.id}
                  node={node}
                  openIds={openIds}
                  onToggle={handleToggle}
                  depth={0}
                />
              ))
            )}
          </div>
        </div>
      </main>
    </div>
  )
}
