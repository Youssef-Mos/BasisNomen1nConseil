/**
 * SearchResultsPanel — Panneau de résultats de recherche OCR.
 * Client Component : affiche les captures correspondant à la requête,
 * avec le mot-clé mis en évidence dans l'extrait OCR.
 * Chaque résultat est cliquable pour naviguer vers l'article.
 */

"use client"

import type { SearchResultItem } from "@/lib/types"

interface SearchResultsPanelProps {
  query: string
  results: SearchResultItem[]
  onNavigate: (articleId: string) => void
  onClose: () => void
}

/** Découpe le texte autour du mot-clé et retourne les fragments [avant, mot, après]. */
function splitByQuery(
  text: string,
  query: string,
): Array<{ type: "text" | "match"; value: string }> {
  if (!query) return [{ type: "text", value: text }]

  const parts: Array<{ type: "text" | "match"; value: string }> = []
  const lower  = text.toLowerCase()
  const lquery = query.toLowerCase()
  let   cursor = 0

  while (cursor < text.length) {
    const idx = lower.indexOf(lquery, cursor)
    if (idx === -1) {
      parts.push({ type: "text", value: text.slice(cursor) })
      break
    }
    if (idx > cursor) {
      parts.push({ type: "text", value: text.slice(cursor, idx) })
    }
    parts.push({ type: "match", value: text.slice(idx, idx + query.length) })
    cursor = idx + query.length
  }

  return parts
}

export function SearchResultsPanel({
  query,
  results,
  onNavigate,
  onClose,
}: SearchResultsPanelProps) {
  if (results.length === 0) {
    return (
      <div className="border-t border-gray-200 bg-amber-50 px-6 py-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-slate-500">
            Aucun résultat pour{" "}
            <span className="font-semibold text-slate-700">«&nbsp;{query}&nbsp;»</span>.
          </p>
          <button
            onClick={onClose}
            className="text-xs text-slate-400 transition hover:text-slate-600"
          >
            ✕ Fermer
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col border-t border-gray-200 bg-white shadow-inner">
      {/* En-tête du panneau */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-gray-50 px-6 py-3">
        <p className="text-sm font-medium text-slate-700">
          <span className="text-slate-900">{results.length}</span> résultat
          {results.length !== 1 ? "s" : ""} pour{" "}
          <span className="rounded bg-yellow-100 px-1.5 py-0.5 font-semibold text-yellow-800">
            {query}
          </span>
        </p>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600"
          title="Fermer les résultats"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      {/* Liste de résultats scrollable */}
      <div className="flex-1 overflow-y-auto">
        <ul className="divide-y divide-gray-100">
          {results.map((item) => (
            <li key={item.zoneId}>
              <button
                onClick={() => onNavigate(item.articleId)}
                className="group flex w-full gap-4 px-6 py-4 text-left transition hover:bg-amber-50"
              >
                {/* Miniature de l'image */}
                <div className="relative shrink-0">
                  {item.imagePath ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={`/${item.imagePath}`}
                      alt={`Capture — page ${item.zonePage}`}
                      className="h-20 w-32 rounded-md border border-gray-200 object-cover shadow-sm group-hover:border-amber-300"
                      loading="lazy"
                      decoding="async"
                    />
                  ) : (
                    <div className="flex h-20 w-32 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs text-slate-400">
                      Image indisponible
                    </div>
                  )}
                  {/* Badge numéro de page */}
                  <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[10px] text-white">
                    p.&nbsp;{item.zonePage}
                  </span>
                </div>

                {/* Informations textuelles */}
                <div className="min-w-0 flex-1">
                  {/* Référence article */}
                  <p className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none"
                      stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                    {item.articleTitle ?? item.articleSlug}
                    <span className="text-slate-300">·</span>
                    page&nbsp;{item.articlePage}
                  </p>

                  {/* Extrait OCR avec surlignage */}
                  <p className="line-clamp-3 text-xs leading-relaxed text-slate-600">
                    {splitByQuery(item.excerpt, query).map((part, i) =>
                      part.type === "match" ? (
                        <mark
                          key={i}
                          className="rounded-sm bg-yellow-200 px-0.5 text-yellow-900 not-italic"
                        >
                          {part.value}
                        </mark>
                      ) : (
                        <span key={i}>{part.value}</span>
                      ),
                    )}
                  </p>

                  {/* Lien visuel */}
                  <p className="mt-1.5 text-xs font-medium text-slate-400 transition group-hover:text-amber-600">
                    Voir l&apos;article →
                  </p>
                </div>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
