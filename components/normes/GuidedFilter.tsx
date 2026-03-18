/**
 * GuidedFilter — Parcours de questions guidées pour filtrer les articles.
 * Client Component :
 * - Affiche une question à la fois avec des boutons de réponse
 * - Accumule les tags au fil des réponses
 * - Affiche les articles correspondants en fin de parcours
 * - Navigation identique à la sidebar (clic → article + scroll)
 */

"use client"

import { useState, useCallback } from "react"
import { filterQuestions } from "@/lib/filter-questions"
import type { FilterAnswer } from "@/lib/filter-questions"
import type { FilterResultItem } from "@/lib/types"

interface GuidedFilterProps {
  documentId: string
  onNavigate: (articleId: string) => void
  onClose: () => void
}

// ---------------------------------------------------------------------------
// Types internes
// ---------------------------------------------------------------------------

type SelectedAnswer = {
  questionId: string
  answerId: string
  answerLabel: string
  tags: string[]
  nextQuestionId: string | null
}

type Phase =
  | { type: "question"; questionId: string }
  | { type: "loading" }
  | { type: "results"; results: FilterResultItem[]; tags: string[] }

// ---------------------------------------------------------------------------
// Composant
// ---------------------------------------------------------------------------

export function GuidedFilter({ documentId, onNavigate, onClose }: GuidedFilterProps) {
  const [history, setHistory] = useState<SelectedAnswer[]>([])
  const [phase, setPhase]     = useState<Phase>({
    type:       "question",
    questionId: filterQuestions.firstQuestionId,
  })

  // ── Sélection d'une réponse ──────────────────────────────────────────────

  const handleAnswer = useCallback(
    async (answer: FilterAnswer) => {
      if (phase.type !== "question") return

      const selected: SelectedAnswer = {
        questionId:     phase.questionId,
        answerId:       answer.id,
        answerLabel:    answer.label,
        tags:           answer.tags,
        nextQuestionId: answer.nextQuestionId,
      }
      const newHistory = [...history, selected]
      setHistory(newHistory)

      if (answer.nextQuestionId) {
        // Question suivante
        setPhase({ type: "question", questionId: answer.nextQuestionId })
      } else {
        // Fin du parcours → appel API de filtrage
        const allTags = newHistory.flatMap((h) => h.tags)
        setPhase({ type: "loading" })
        try {
          const res = await fetch(
            `/api/documents/${documentId}/filter?tags=${encodeURIComponent(allTags.join(","))}`,
          )
          if (res.ok) {
            const data = await res.json()
            setPhase({ type: "results", results: data.results ?? [], tags: allTags })
          } else {
            setPhase({ type: "results", results: [], tags: allTags })
          }
        } catch {
          setPhase({ type: "results", results: [], tags: allTags })
        }
      }
    },
    [phase, history, documentId],
  )

  // ── Retour à la question précédente ─────────────────────────────────────

  const handleBack = useCallback(() => {
    if (history.length === 0) {
      onClose()
      return
    }
    const last       = history[history.length - 1]
    const newHistory = history.slice(0, -1)
    setHistory(newHistory)
    setPhase({ type: "question", questionId: last.questionId })
  }, [history, onClose])

  // ── Recommencer depuis le début ──────────────────────────────────────────

  const handleReset = useCallback(() => {
    setHistory([])
    setPhase({ type: "question", questionId: filterQuestions.firstQuestionId })
  }, [])

  // ── Navigation vers un article ───────────────────────────────────────────

  const handleNavigate = useCallback(
    (articleId: string) => {
      onNavigate(articleId)
    },
    [onNavigate],
  )

  // ── Fil d'Ariane ────────────────────────────────────────────────────────

  const breadcrumbs = history.map((h) => h.answerLabel)

  // ── Rendu ────────────────────────────────────────────────────────────────

  return (
    <div className="flex flex-col border-t border-gray-200 bg-white shadow-inner">

      {/* ── En-tête ──────────────────────────────────────────────────────── */}
      <div className="flex shrink-0 items-center justify-between border-b border-gray-100 bg-blue-50 px-6 py-3">
        <div className="flex items-center gap-2">
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none"
            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            className="text-blue-600"
          >
            <circle cx="12" cy="12" r="10" />
            <path d="M12 16v-4" />
            <path d="M12 8h.01" />
          </svg>
          <p className="text-sm font-medium text-blue-900">Filtres guidés</p>
        </div>

        <div className="flex items-center gap-3">
          {history.length > 0 && (
            <button
              onClick={handleReset}
              className="text-xs text-blue-500 transition hover:text-blue-700"
            >
              Recommencer
            </button>
          )}
          <button
            onClick={onClose}
            className="rounded p-1 text-slate-400 transition hover:bg-gray-100 hover:text-slate-600"
            title="Fermer les filtres guidés"
          >
            <svg
              width="14" height="14" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
            >
              <line x1="18" y1="6" x2="6" y2="18" />
              <line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>
      </div>

      {/* ── Fil d'Ariane ─────────────────────────────────────────────────── */}
      {breadcrumbs.length > 0 && (
        <div className="border-b border-gray-100 bg-gray-50 px-6 py-2">
          <div className="flex flex-wrap items-center gap-1 text-xs text-slate-500">
            {breadcrumbs.map((label, i) => (
              <span key={i} className="flex items-center gap-1">
                {i > 0 && <span className="text-slate-300">›</span>}
                <span className="rounded bg-blue-100 px-1.5 py-0.5 text-blue-700">
                  {label}
                </span>
              </span>
            ))}
          </div>
        </div>
      )}

      {/* ── Contenu ──────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto">

        {/* Phase : question ─────────────────────────────────────────────── */}
        {phase.type === "question" && (
          <div className="px-6 py-5">

            {/* Bouton retour */}
            {history.length > 0 && (
              <button
                onClick={handleBack}
                className="mb-4 flex items-center gap-1.5 text-xs text-slate-500 transition hover:text-slate-700"
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Retour
              </button>
            )}

            {/* Intitulé de la question */}
            <p className="mb-4 text-sm font-semibold text-slate-800">
              {filterQuestions.questions[phase.questionId]?.label}
            </p>

            {/* Boutons de réponse */}
            <div className="space-y-2">
              {filterQuestions.questions[phase.questionId]?.answers.map((answer) => (
                <button
                  key={answer.id}
                  onClick={() => handleAnswer(answer)}
                  className="group flex w-full items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3 text-left text-sm text-slate-700 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 hover:text-blue-800"
                >
                  <span>{answer.label}</span>
                  <svg
                    width="14" height="14" viewBox="0 0 24 24" fill="none"
                    stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                    className="shrink-0 text-slate-400 group-hover:text-blue-500"
                  >
                    <polyline points="9 18 15 12 9 6" />
                  </svg>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Phase : chargement ────────────────────────────────────────────── */}
        {phase.type === "loading" && (
          <div className="flex items-center justify-center py-12">
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <svg
                className="animate-spin"
                width="16" height="16" viewBox="0 0 24 24" fill="none"
                stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              >
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Recherche des articles correspondants…
            </div>
          </div>
        )}

        {/* Phase : résultats ─────────────────────────────────────────────── */}
        {phase.type === "results" && (
          <div>
            {/* En-tête résultats */}
            <div className="flex shrink-0 items-center justify-between border-b border-gray-100 px-6 py-3">
              <p className="text-sm text-slate-700">
                <span className="font-semibold text-slate-900">{phase.results.length}</span>{" "}
                article{phase.results.length !== 1 ? "s" : ""} trouvé
                {phase.results.length !== 1 ? "s" : ""}
              </p>
              <button
                onClick={handleBack}
                className="flex items-center gap-1 text-xs text-slate-500 transition hover:text-slate-700"
              >
                <svg
                  width="12" height="12" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                >
                  <polyline points="15 18 9 12 15 6" />
                </svg>
                Modifier la sélection
              </button>
            </div>

            {/* Aucun résultat */}
            {phase.results.length === 0 ? (
              <div className="px-6 py-8 text-center">
                <p className="text-sm text-slate-500">
                  Aucun article ne correspond à cette sélection.
                </p>
                <button
                  onClick={handleReset}
                  className="mt-3 text-xs text-blue-600 transition hover:text-blue-800"
                >
                  Recommencer le parcours
                </button>
              </div>
            ) : (
              /* Liste des articles */
              <ul className="divide-y divide-gray-100">
                {phase.results.map((item) => (
                  <li key={item.articleId}>
                    <button
                      onClick={() => handleNavigate(item.articleId)}
                      className="group flex w-full gap-4 px-6 py-4 text-left transition hover:bg-blue-50"
                    >
                      {/* Aperçu image */}
                      <div className="relative shrink-0">
                        {item.previewImagePath ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={`/${item.previewImagePath}`}
                            alt={`Aperçu — page ${item.articlePage}`}
                            className="h-20 w-32 rounded-md border border-gray-200 object-cover shadow-sm group-hover:border-blue-300"
                            loading="lazy"
                            decoding="async"
                          />
                        ) : (
                          <div className="flex h-20 w-32 items-center justify-center rounded-md border border-gray-200 bg-gray-50 text-xs text-slate-400">
                            Pas d&apos;aperçu
                          </div>
                        )}
                        {/* Badge numéro de page */}
                        <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1 py-0.5 text-[10px] text-white">
                          p.&nbsp;{item.articlePage}
                        </span>
                      </div>

                      {/* Informations article */}
                      <div className="min-w-0 flex-1">
                        <p className="mb-1 flex items-center gap-1.5 text-xs text-slate-400">
                          <svg
                            width="10" height="10" viewBox="0 0 24 24" fill="none"
                            stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
                          >
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                            <polyline points="14 2 14 8 20 8" />
                          </svg>
                          {item.articleSlug}
                        </p>
                        <p className="text-sm font-medium leading-snug text-slate-800 group-hover:text-blue-800">
                          {item.articleTitle ?? item.articleSlug}
                        </p>
                        <p className="mt-1.5 text-xs font-medium text-slate-400 transition group-hover:text-blue-600">
                          Voir l&apos;article →
                        </p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
