/**
 * SearchBar — Recherche manuelle dans le document courant.
 * Client Component : la recherche se déclenche uniquement sur clic du bouton
 * "Rechercher" ou sur la touche Entrée — jamais automatiquement.
 * Remonte les résultats au parent via onResults.
 */

"use client"

import { useState, useCallback } from "react"
import type { SearchResultItem } from "@/lib/types"

interface SearchBarProps {
  documentId: string
  onResults: (results: SearchResultItem[] | null, query: string) => void
}

export function SearchBar({ documentId, onResults }: SearchBarProps) {
  const [query, setQuery]     = useState("")
  const [loading, setLoading] = useState(false)
  const [count, setCount]     = useState<number | null>(null)

  const runSearch = useCallback(async () => {
    const trimmed = query.trim()

    if (trimmed.length < 2) return

    setLoading(true)
    try {
      const res  = await fetch(
        `/api/documents/${documentId}/search?q=${encodeURIComponent(trimmed)}`,
      )
      const data = await res.json()
      setCount(data?.total ?? 0)
      onResults(data?.results ?? [], trimmed)
    } catch {
      setCount(0)
      onResults([], trimmed)
    } finally {
      setLoading(false)
    }
  }, [query, documentId, onResults])

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") runSearch()
  }

  const handleClear = () => {
    setQuery("")
    setCount(null)
    onResults(null, "")
  }

  return (
    <div className="flex items-center gap-3">
      {/* Input */}
      <div className="relative flex-1">
        <svg
          className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-slate-400"
          width="14" height="14" viewBox="0 0 24 24" fill="none"
          stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
        >
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            // Réinitialiser les résultats si l'utilisateur efface le champ
            if (e.target.value.trim() === "") {
              setCount(null)
              onResults(null, "")
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Rechercher dans le document…"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </div>

      {/* Bouton Rechercher */}
      <button
        onClick={runSearch}
        disabled={loading || query.trim().length < 2}
        className="shrink-0 rounded-lg bg-slate-700 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-40"
      >
        {loading ? "Recherche…" : "Rechercher"}
      </button>

      {/* Effacer */}
      {count !== null && (
        <button
          onClick={handleClear}
          className="shrink-0 text-xs text-slate-400 transition hover:text-slate-600"
          title="Effacer la recherche"
        >
          ✕
        </button>
      )}

      {/* Compteur de résultats */}
      <span className="w-28 shrink-0 text-right text-xs text-slate-400">
        {!loading && count !== null && (
          <>{count} résultat{count !== 1 ? "s" : ""}</>
        )}
        {!loading && count === null && query.trim().length >= 1 && query.trim().length < 2 && (
          <>2 caractères min</>
        )}
      </span>
    </div>
  )
}
