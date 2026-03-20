"use client"

/**
 * app/[locale]/import/page.tsx
 *
 * Page d'import et d'analyse de PDF.
 *
 * États :
 *   idle        → Zone d'upload vide
 *   uploading   → Upload en cours vers l'API
 *   uploaded    → Fichier uploadé, FileCard affichée + ouverture de la confirmation
 *   confirming  → Modale de confirmation ouverte
 *   analyzing   → Analyse Python en cours, modale de progression affichée
 *   success     → Analyse terminée (succès)
 *   error       → Erreur upload ou analyse
 */

import React, { useCallback, useEffect, useRef, useState } from "react"
import { useParams } from "next/navigation"
import Link from "next/link"
import { UploadZone } from "@/components/pdf-import/UploadZone"
import { FileCard } from "@/components/pdf-import/FileCard"
import { ConfirmModal } from "@/components/pdf-import/ConfirmModal"
import { AnalysisModal } from "@/components/pdf-import/AnalysisModal"
import type { PipelineJob, UploadedFile } from "@/lib/types"

// ---------------------------------------------------------------------------
// Types d'état
// ---------------------------------------------------------------------------

type ImportState =
  | "idle"
  | "uploading"
  | "uploaded"
  | "confirming"
  | "analyzing"
  | "success"
  | "error"

const POLL_INTERVAL_MS = 1500

// ---------------------------------------------------------------------------
// Page
// ---------------------------------------------------------------------------

export default function ImportPage() {
  const params = useParams()
  const locale = (params?.locale as string) ?? "fr"

  const [state, setState] = useState<ImportState>("idle")
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [uploadedFile, setUploadedFile] = useState<UploadedFile | null>(null)
  const [uploadError, setUploadError] = useState<string | null>(null)
  const [job, setJob] = useState<PipelineJob | null>(null)

  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // ---------------------------------------------------------------------------
  // Arrêt du polling
  // ---------------------------------------------------------------------------

  const stopPolling = useCallback(() => {
    if (pollRef.current !== null) {
      clearInterval(pollRef.current)
      pollRef.current = null
    }
  }, [])

  useEffect(() => {
    return () => stopPolling()
  }, [stopPolling])

  // ---------------------------------------------------------------------------
  // Polling du statut du job
  // ---------------------------------------------------------------------------

  const startPolling = useCallback(
    (jobId: string) => {
      const poll = async () => {
        try {
          const res = await fetch(`/api/pdf/status/${jobId}`)
          if (!res.ok) return
          const data = (await res.json()) as PipelineJob
          setJob(data)

          if (data.status === "success") {
            setState("success")
            stopPolling()
          } else if (data.status === "error") {
            setState("error")
            stopPolling()
          }
        } catch {
          // Silently ignore transient network errors
        }
      }

      // Première interrogation immédiate
      void poll()
      pollRef.current = setInterval(poll, POLL_INTERVAL_MS)
    },
    [stopPolling]
  )

  // ---------------------------------------------------------------------------
  // Sélection d'un fichier
  // ---------------------------------------------------------------------------

  const handleFileSelected = useCallback((file: File) => {
    setSelectedFile(file)
    setUploadError(null)
    setUploadedFile(null)
    setState("uploading")
    uploadFile(file)
  }, [])

  // ---------------------------------------------------------------------------
  // Upload du fichier
  // ---------------------------------------------------------------------------

  async function uploadFile(file: File) {
    try {
      const formData = new FormData()
      formData.append("file", file)

      const res = await fetch("/api/pdf/upload", {
        method: "POST",
        body: formData,
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Erreur lors de l'upload.")
      }

      const data = (await res.json()) as UploadedFile
      setUploadedFile(data)
      setState("uploaded")

      // Ouvrir directement la confirmation
      setTimeout(() => setState("confirming"), 300)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Upload échoué.")
      setState("error")
    }
  }

  // ---------------------------------------------------------------------------
  // Démarrage de l'analyse
  // ---------------------------------------------------------------------------

  async function handleStartAnalysis() {
    if (!uploadedFile) return

    setState("analyzing")

    try {
      const res = await fetch("/api/pdf/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ filename: uploadedFile.filename }),
      })

      if (!res.ok) {
        const data = (await res.json()) as { error?: string }
        throw new Error(data.error ?? "Impossible de démarrer l'analyse.")
      }

      const data = (await res.json()) as { jobId: string }
      startPolling(data.jobId)
    } catch (err) {
      setUploadError(err instanceof Error ? err.message : "Erreur de démarrage.")
      setState("error")
    }
  }

  // ---------------------------------------------------------------------------
  // Réinitialisation
  // ---------------------------------------------------------------------------

  function handleReset() {
    stopPolling()
    setState("idle")
    setSelectedFile(null)
    setUploadedFile(null)
    setUploadError(null)
    setJob(null)
  }

  // ---------------------------------------------------------------------------
  // Rendu
  // ---------------------------------------------------------------------------

  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-2xl px-6 py-16">
        {/* En-tête */}
        <header className="mb-10">
          <Link
            href={`/${locale}/normes`}
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-400 transition hover:text-slate-600"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-4 w-4"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M17 10a.75.75 0 0 1-.75.75H5.612l4.158 3.96a.75.75 0 1 1-1.04 1.08l-5.5-5.25a.75.75 0 0 1 0-1.08l5.5-5.25a.75.75 0 1 1 1.04 1.08L5.612 9.25H16.25A.75.75 0 0 1 17 10Z"
                clipRule="evenodd"
              />
            </svg>
            Bibliothèque
          </Link>

          <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-slate-400">
            Basis Norm Explorer
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
            Importer un PDF
          </h1>
          <p className="mt-2 text-sm text-slate-500">
            Téléversez un document PDF pour le faire analyser et le rendre
            disponible dans la bibliothèque.
          </p>
        </header>

        {/* Zone principale */}
        <div className="space-y-5">
          {/* Affichage du fichier sélectionné */}
          {selectedFile && (
            <FileCard
              name={selectedFile.name}
              size={selectedFile.size}
              uploading={state === "uploading"}
              uploadError={state === "error" && uploadError ? uploadError : null}
              onRemove={state !== "uploading" && state !== "analyzing" ? handleReset : undefined}
            />
          )}

          {/* Zone d'upload — cachée une fois qu'un fichier est sélectionné */}
          {!selectedFile || state === "error" ? (
            <UploadZone
              onFileSelected={handleFileSelected}
              disabled={state === "uploading"}
            />
          ) : null}

          {/* Message d'erreur upload (hors fichier) */}
          {state === "error" && uploadError && !selectedFile && (
            <div
              role="alert"
              className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
            >
              <p className="text-sm text-red-700">{uploadError}</p>
            </div>
          )}
        </div>

        {/* Conseils */}
        {state === "idle" && (
          <div className="mt-8 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              À propos de l&apos;analyse
            </h2>
            <ul className="space-y-2 text-sm text-slate-500">
              {[
                "Génération des captures d'écran de chaque page",
                "Extraction du texte OCR pour la recherche",
                "Construction de la hiérarchie des articles",
                "Détection automatique des zones visuelles",
              ].map((tip) => (
                <li key={tip} className="flex items-start gap-2">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    viewBox="0 0 20 20"
                    fill="currentColor"
                    className="mt-0.5 h-4 w-4 shrink-0 text-blue-400"
                    aria-hidden="true"
                  >
                    <path
                      fillRule="evenodd"
                      d="M10 18a8 8 0 1 0 0-16 8 8 0 0 0 0 16Zm3.857-9.809a.75.75 0 0 0-1.214-.882l-3.483 4.79-1.88-1.88a.75.75 0 1 0-1.06 1.061l2.5 2.5a.75.75 0 0 0 1.137-.089l4-5.5Z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {tip}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Modale de confirmation */}
      {state === "confirming" && uploadedFile && selectedFile && (
        <ConfirmModal
          filename={selectedFile.name}
          fileSize={selectedFile.size}
          onConfirm={handleStartAnalysis}
          onCancel={() => setState("uploaded")}
        />
      )}

      {/* Modale d'analyse */}
      {(state === "analyzing" || state === "success" || state === "error") &&
        job && (
          <AnalysisModal
            job={job}
            locale={locale}
            onRetry={handleReset}
            onClose={handleReset}
          />
        )}
    </main>
  )
}
