/**
 * ArticleAccordion — Accordéon récursif pour un article et ses enfants.
 * Client Component :
 * - L'état ouvert/fermé est contrôlé par le parent (DocsLayout via openIds).
 * - Quand il s'ouvre et que l'article a des zones, charge les détails de l'article
 *   via /api/articles/:id (lazy loading).
 * - Si un parent est fermé, tous ses descendants se ferment automatiquement (géré dans DocsLayout).
 */

"use client"

import { useEffect, useState } from "react"
import type { ArticleTreeNode, ArticleDetail } from "@/lib/types"
import { ArticleCard } from "./ArticleCard"

interface ArticleAccordionProps {
  node: ArticleTreeNode
  openIds: Set<string>
  onToggle: (id: string) => void
  depth: number
}

export function ArticleAccordion({
  node,
  openIds,
  onToggle,
  depth,
}: ArticleAccordionProps) {
  const isOpen = openIds.has(node.id)

  const [detail, setDetail]   = useState<ArticleDetail | null>(null)
  const [loading, setLoading] = useState(false)

  // Lazy-load les zones uniquement quand l'accordéon s'ouvre
  useEffect(() => {
    if (isOpen && node.hasZones && !detail && !loading) {
      setLoading(true)
      fetch(`/api/articles/${node.id}`)
        .then((r) => (r.ok ? r.json() : null))
        .then(setDetail)
        .catch(() => setDetail(null))
        .finally(() => setLoading(false))
    }
  }, [isOpen, node.id, node.hasZones, detail, loading])

  const hasChildren = node.children.length > 0
  const isRoot      = depth === 0

  return (
    <div id={node.id} className={!isRoot ? "ml-4 border-l border-gray-100 pl-0" : ""}>

      {/* ── En-tête ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => onToggle(node.id)}
        className={[
          "group flex w-full items-center justify-between gap-3 rounded-xl border bg-white text-left shadow-sm transition-all",
          isRoot ? "px-6 py-4" : "px-5 py-3",
          isOpen
            ? "border-slate-300"
            : "border-gray-200 hover:border-slate-300 hover:shadow-md",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="flex min-w-0 items-baseline gap-3">
          <span
            className={[
              "truncate font-semibold",
              isRoot ? "text-base text-slate-900" : "text-sm text-slate-700",
            ].join(" ")}
          >
            {node.title ?? node.slug}
          </span>
          <span className="shrink-0 text-xs text-slate-400">
            p.&nbsp;{node.pageStart}
            {node.pageEnd && node.pageEnd !== node.pageStart && `–${node.pageEnd}`}
          </span>
        </div>

        {/* Chevron animé */}
        <svg
          width="16" height="16" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
          className={[
            "shrink-0 text-slate-400 transition-transform duration-200",
            isOpen ? "rotate-90" : "",
          ].join(" ")}
        >
          <polyline points="9 18 15 12 9 6" />
        </svg>
      </button>

      {/* ── Contenu déplié ──────────────────────────────────────────────── */}
      {isOpen && (
        <div className="mt-1 space-y-1.5 pl-2">
          {/* Zones visuelles (extrait PDF) */}
          {node.hasZones && (
            <ArticleCard detail={detail} loading={loading} />
          )}

          {/* Enfants récursifs */}
          {hasChildren && (
            <div className="space-y-1.5">
              {node.children.map((child) => (
                <ArticleAccordion
                  key={child.id}
                  node={child}
                  openIds={openIds}
                  onToggle={onToggle}
                  depth={depth + 1}
                />
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
