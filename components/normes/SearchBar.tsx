/**
 * SearchBar — Recherche dans le document courant.
 * Client Component : debounce 350ms, appel GET /api/documents/:id/search?q=...
 * Remonte les résultats au parent via onResults.
 */

"use client"

import { useState, useEffect } from "react"
import type { SearchResultItem } from "@/lib/types"

interface SearchBarProps {
  documentId: string
  onResults: (results: SearchResultItem[] | null) => void
}

export function SearchBar({ documentId, onResults }: SearchBarProps) {
  const [query, setQuery]   = useState("")
  const [loading, setLoading] = useState(false)
  const [count, setCount]   = useState<number | null>(null)

  useEffect(() => {
    const trimmed = query.trim()

    if (trimmed.length < 2) {
      setCount(null)
      onResults(null)
      return
    }

    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const res  = await fetch(
          `/api/documents/${documentId}/search?q=${encodeURIComponent(trimmed)}`,
        )
        const data = await res.json()
        setCount(data?.total ?? 0)
        onResults(data?.results ?? [])
      } catch {
        setCount(0)
        onResults([])
      } finally {
        setLoading(false)
      }
    }, 350)

    return () => clearTimeout(timer)
  }, [query, documentId, onResults])

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
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Rechercher dans le document…"
          className="w-full rounded-lg border border-gray-200 bg-gray-50 py-2 pl-9 pr-4 text-sm text-slate-700 outline-none transition focus:border-slate-400 focus:bg-white"
        />
      </div>

      {/* Indicateur */}
      <span className="w-28 shrink-0 text-right text-xs text-slate-400">
        {loading && "Recherche…"}
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
