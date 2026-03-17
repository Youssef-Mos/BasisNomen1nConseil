/**
 * ArticleCard — Contenu visuel d'un article ouvert.
 * Affiche les crops PDF (images) et propose le texte OCR en mode lecture seule.
 *
 * IMPORTANT — rôle du texte OCR :
 *   Le texte OCR est uniquement destiné à la copie et au surlignage.
 *   L'image reste toujours la vue principale du contenu.
 */

"use client"

import { useState } from "react"
import type { ArticleDetail } from "@/lib/types"

interface ArticleCardProps {
  detail: ArticleDetail | null
  loading: boolean
}

export function ArticleCard({ detail, loading }: ArticleCardProps) {
  const [showOcr, setShowOcr] = useState(false)

  // ── État de chargement ───────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
        <div className="animate-pulse space-y-3">
          <div className="h-3 w-2/5 rounded bg-gray-100" />
          <div className="h-40 rounded-lg bg-gray-50" />
        </div>
      </div>
    )
  }

  if (!detail || detail.zones.length === 0) return null

  const hasOcr = detail.zones.some((z) => z.ocrText)

  // ── Contenu ──────────────────────────────────────────────────────────────
  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      {/* Images des zones PDF */}
      <div className="divide-y divide-gray-100">
        {detail.zones.map((zone) => (
          <div key={zone.id} className="p-4">
            {zone.imagePath ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={`/${zone.imagePath}`}
                alt={`Extrait PDF — page ${zone.page}`}
                className="w-full rounded-lg border border-gray-100 shadow-sm"
                loading="lazy"
                decoding="async"
              />
            ) : (
              <p className="py-6 text-center text-sm italic text-slate-400">
                Image non disponible pour cette zone.
              </p>
            )}
          </div>
        ))}
      </div>

      {/* Texte OCR (optionnel — pour copie uniquement) */}
      {hasOcr && (
        <div className="border-t border-gray-100 px-5 py-3">
          <button
            onClick={() => setShowOcr((v) => !v)}
            className="flex items-center gap-1.5 text-xs text-slate-400 transition-colors hover:text-slate-600"
          >
            <svg
              width="12" height="12" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              className={`transition-transform ${showOcr ? "rotate-90" : ""}`}
            >
              <polyline points="9 18 15 12 9 6" />
            </svg>
            {showOcr ? "Masquer le texte OCR" : "Afficher le texte OCR"}
            <span className="ml-1 text-slate-300">(copie uniquement)</span>
          </button>

          {showOcr && (
            <div className="mt-3 space-y-2">
              {detail.zones.map(
                (zone) =>
                  zone.ocrText && (
                    <pre
                      key={zone.id}
                      className="whitespace-pre-wrap rounded-lg bg-gray-50 p-4 font-mono text-xs leading-relaxed text-slate-600 select-all"
                    >
                      {zone.ocrText.text}
                    </pre>
                  ),
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
