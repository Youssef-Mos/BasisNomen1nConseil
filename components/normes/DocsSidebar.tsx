/**
 * DocsSidebar — Table des matières (arbre d'articles).
 * Client Component : affiche la hiérarchie, met en évidence l'article actif
 * et réduit visuellement les articles hors résultats de recherche.
 */

"use client"

import type { ArticleTreeNode } from "@/lib/types"

interface DocsSidebarProps {
  tree: ArticleTreeNode[]
  activeId: string | null
  matchingIds: Set<string> | null
  onSelect: (id: string) => void
}

// ---------------------------------------------------------------------------
// Item récursif
// ---------------------------------------------------------------------------

interface ItemProps {
  node: ArticleTreeNode
  depth: number
  activeId: string | null
  matchingIds: Set<string> | null
  onSelect: (id: string) => void
}

function SidebarItem({ node, depth, activeId, matchingIds, onSelect }: ItemProps) {
  const isActive  = node.id === activeId
  const isMatch   = matchingIds?.has(node.id) ?? false
  const isDimmed  = matchingIds !== null && !isMatch && !isActive

  return (
    <li>
      <button
        onClick={() => onSelect(node.id)}
        title={node.title ?? node.slug}
        style={{ paddingLeft: `${0.5 + depth * 0.875}rem` }}
        className={[
          "w-full rounded-md py-1.5 pr-3 text-left text-sm leading-snug transition-colors",
          depth === 0 ? "font-medium" : "font-normal",
          isActive
            ? "bg-slate-100 text-slate-900"
            : isDimmed
            ? "text-slate-300"
            : isMatch
            ? "font-medium text-slate-900"
            : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <span className="block truncate">{node.title ?? node.slug}</span>
      </button>

      {node.children.length > 0 && (
        <ul>
          {node.children.map((child) => (
            <SidebarItem
              key={child.id}
              node={child}
              depth={depth + 1}
              activeId={activeId}
              matchingIds={matchingIds}
              onSelect={onSelect}
            />
          ))}
        </ul>
      )}
    </li>
  )
}

// ---------------------------------------------------------------------------
// Sidebar
// ---------------------------------------------------------------------------

export function DocsSidebar({ tree, activeId, matchingIds, onSelect }: DocsSidebarProps) {
  return (
    <nav aria-label="Table des matières" className="px-2 py-3">
      <ul className="space-y-px">
        {tree.map((node) => (
          <SidebarItem
            key={node.id}
            node={node}
            depth={0}
            activeId={activeId}
            matchingIds={matchingIds}
            onSelect={onSelect}
          />
        ))}
      </ul>
    </nav>
  )
}
