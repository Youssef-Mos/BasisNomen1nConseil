"use client"

/**
 * components/pdf-import/AnalysisModal.tsx
 *
 * Modale d'analyse avec timeline d'étapes, barre de progression et états
 * de succès / erreur. Bloquante pendant l'analyse, fermable en fin de traitement.
 */

import Link from "next/link"
import type { PipelineJob, PipelineStep } from "@/lib/types"

type AnalysisModalProps = {
  job: PipelineJob
  locale: string
  onRetry: () => void
  onClose: () => void
}

export function AnalysisModal({
  job,
  locale,
  onRetry,
  onClose,
}: AnalysisModalProps) {
  const isFinished = job.status === "success" || job.status === "error"

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="analysis-modal-title"
    >
      {/* Overlay — non cliquable pendant l'analyse */}
      <div
        className={[
          "absolute inset-0 bg-slate-900/40 backdrop-blur-sm",
          isFinished ? "cursor-pointer" : "cursor-not-allowed",
        ].join(" ")}
        onClick={isFinished ? onClose : undefined}
        aria-hidden="true"
      />

      {/* Panneau */}
      <div className="relative w-full max-w-lg animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5">
        {/* En-tête */}
        <div className="flex items-start justify-between border-b border-slate-100 px-6 py-5">
          <div>
            <h2
              id="analysis-modal-title"
              className="text-base font-semibold text-slate-900"
            >
              {job.status === "success"
                ? "Analyse terminée"
                : job.status === "error"
                  ? "Analyse échouée"
                  : "Analyse en cours…"}
            </h2>
            <p className="mt-0.5 text-sm text-slate-500">
              {job.status === "success"
                ? "Le document est prêt à être exploré."
                : job.status === "error"
                  ? "Une erreur est survenue lors du traitement."
                  : "Veuillez patienter, le traitement est en cours."}
            </p>
          </div>

          {/* Bouton fermer — uniquement quand terminé */}
          {isFinished && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Fermer"
              className="ml-4 shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 20 20"
                fill="currentColor"
                className="h-5 w-5"
                aria-hidden="true"
              >
                <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
              </svg>
            </button>
          )}
        </div>

        {/* Barre de progression globale */}
        <div className="px-6 pt-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Progression globale</span>
            <span className="text-xs font-semibold tabular-nums text-slate-700">
              {job.progress}%
            </span>
          </div>
          <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className={[
                "h-full rounded-full transition-all duration-500",
                job.status === "success"
                  ? "bg-emerald-500"
                  : job.status === "error"
                    ? "bg-red-500"
                    : "bg-blue-500",
              ].join(" ")}
              style={{ width: `${job.progress}%` }}
              role="progressbar"
              aria-valuenow={job.progress}
              aria-valuemin={0}
              aria-valuemax={100}
            />
          </div>
        </div>

        {/* Timeline des étapes */}
        <div className="px-6 py-5 space-y-1 max-h-72 overflow-y-auto">
          {job.steps.map((step, index) => (
            <StepRow key={step.id} step={step} isLast={index === job.steps.length - 1} />
          ))}
        </div>

        {/* Pied de page — Actions */}
        {job.status === "success" && job.documentId && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row">
            <Link
              href={`/${locale}/normes/${job.documentId}`}
              className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
            >
              Voir le document analysé
            </Link>
            <Link
              href={`/${locale}/normes`}
              className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-center text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
            >
              Retour à la bibliothèque
            </Link>
          </div>
        )}

        {job.status === "success" && !job.documentId && (
          <div className="border-t border-slate-100 px-6 py-5">
            <Link
              href={`/${locale}/normes`}
              className="block w-full rounded-xl bg-blue-600 px-4 py-2.5 text-center text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700"
            >
              Retour à la bibliothèque
            </Link>
          </div>
        )}

        {job.status === "error" && (
          <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row">
            {job.error && (
              <p className="w-full text-xs text-red-600 bg-red-50 rounded-lg px-3 py-2 break-words">
                {job.error}
              </p>
            )}
            <button
              type="button"
              onClick={onRetry}
              className="w-full rounded-xl bg-slate-800 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-500"
            >
              Réessayer
            </button>
          </div>
        )}

        {/* Loader pendant l'analyse */}
        {(job.status === "queued" || job.status === "running") && (
          <div className="border-t border-slate-100 px-6 py-4 flex items-center gap-3">
            <LoadingSpinner />
            <p className="text-xs text-slate-500">Traitement en cours…</p>
          </div>
        )}
      </div>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Sous-composants
// ---------------------------------------------------------------------------

function StepRow({ step, isLast }: { step: PipelineStep; isLast: boolean }) {
  return (
    <div className={["flex items-start gap-3", !isLast ? "pb-1" : ""].join(" ")}>
      {/* Connecteur vertical + indicateur */}
      <div className="flex flex-col items-center">
        <StepIndicator status={step.status} />
        {!isLast && (
          <div
            className={[
              "mt-1 w-px flex-1",
              step.status === "done" ? "bg-emerald-200" : "bg-slate-100",
            ].join(" ")}
            style={{ minHeight: "16px" }}
            aria-hidden="true"
          />
        )}
      </div>

      {/* Label */}
      <div className="pb-3 min-w-0">
        <p
          className={[
            "text-sm leading-5 transition-colors duration-200",
            step.status === "running"
              ? "font-semibold text-blue-700"
              : step.status === "done"
                ? "font-medium text-slate-700"
                : step.status === "error"
                  ? "font-semibold text-red-700"
                  : "text-slate-400",
          ].join(" ")}
        >
          {step.label}
        </p>
      </div>
    </div>
  )
}

function StepIndicator({ status }: { status: PipelineStep["status"] }) {
  if (status === "running") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100">
        <div className="h-2 w-2 animate-ping rounded-full bg-blue-500" aria-hidden="true" />
      </div>
    )
  }

  if (status === "done") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3 text-emerald-600"
          aria-label="Terminé"
        >
          <path
            fillRule="evenodd"
            d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
            clipRule="evenodd"
          />
        </svg>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-100">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 20 20"
          fill="currentColor"
          className="h-3 w-3 text-red-600"
          aria-label="Erreur"
        >
          <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
        </svg>
      </div>
    )
  }

  // pending
  return (
    <div
      className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-slate-100"
      aria-label="En attente"
    >
      <div className="h-1.5 w-1.5 rounded-full bg-slate-300" />
    </div>
  )
}

function LoadingSpinner() {
  return (
    <svg
      className="h-4 w-4 animate-spin text-blue-500"
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 0 1 8-8V0C5.373 0 0 5.373 0 12h4Z"
      />
    </svg>
  )
}
