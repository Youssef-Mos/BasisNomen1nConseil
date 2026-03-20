"use client"

/**
 * components/pdf-import/ConfirmModal.tsx
 *
 * Modale de confirmation avant de lancer l'analyse du PDF.
 */

type ConfirmModalProps = {
  filename: string
  fileSize: number
  onConfirm: () => void
  onCancel: () => void
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

export function ConfirmModal({
  filename,
  fileSize,
  onConfirm,
  onCancel,
}: ConfirmModalProps) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
    >
      {/* Overlay */}
      <div
        className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
        onClick={onCancel}
        aria-hidden="true"
      />

      {/* Panneau */}
      <div className="relative w-full max-w-md animate-in fade-in zoom-in-95 duration-200 rounded-2xl bg-white p-8 shadow-2xl ring-1 ring-slate-900/5">
        {/* En-tête */}
        <div className="flex flex-col items-center text-center">
          <div className="mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-blue-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              className="h-7 w-7 text-blue-600"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z"
              />
            </svg>
          </div>

          <h2
            id="confirm-modal-title"
            className="text-xl font-semibold text-slate-900"
          >
            Analyser ce PDF ?
          </h2>

          <p className="mt-3 text-sm leading-relaxed text-slate-500">
            L&apos;analyse va générer les captures d&apos;écran de chaque
            page et extraire le texte OCR associé, permettant ensuite une
            navigation intelligente dans le document.
          </p>
        </div>

        {/* Récapitulatif fichier */}
        <div className="mt-6 flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-red-50">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-5 w-5 text-red-500"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M4.5 2A1.5 1.5 0 0 0 3 3.5v13A1.5 1.5 0 0 0 4.5 18h11a1.5 1.5 0 0 0 1.5-1.5V7.621a1.5 1.5 0 0 0-.44-1.06l-4.12-4.122A1.5 1.5 0 0 0 11.378 2H4.5Zm2.25 8.5a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Zm0 3a.75.75 0 0 0 0 1.5h6.5a.75.75 0 0 0 0-1.5h-6.5Z"
                clipRule="evenodd"
              />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-slate-700">{filename}</p>
            <p className="text-xs text-slate-400">{formatBytes(fileSize)}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row">
          <button
            type="button"
            onClick={onCancel}
            className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-blue-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-2"
          >
            Lancer l&apos;analyse
          </button>
        </div>
      </div>
    </div>
  )
}
