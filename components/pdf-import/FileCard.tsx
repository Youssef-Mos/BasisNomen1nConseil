"use client"

/**
 * components/pdf-import/FileCard.tsx
 *
 * Carte récapitulative affichant les métadonnées d'un fichier PDF sélectionné.
 */

type FileCardProps = {
  name: string
  size: number
  onRemove?: () => void
  uploading?: boolean
  uploadError?: string | null
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} o`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`
  return `${(bytes / (1024 * 1024)).toFixed(2)} Mo`
}

export function FileCard({
  name,
  size,
  onRemove,
  uploading = false,
  uploadError = null,
}: FileCardProps) {
  return (
    <div
      className={[
        "flex items-start gap-4 rounded-2xl border p-5 transition-all",
        uploadError
          ? "border-red-200 bg-red-50"
          : "border-slate-200 bg-white shadow-sm",
      ].join(" ")}
    >
      {/* Icône PDF */}
      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-red-50">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1.5}
          className="h-6 w-6 text-red-500"
          aria-hidden="true"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m0 12.75h7.5m-7.5 3H12M10.5 2.25H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
          />
        </svg>
      </div>

      {/* Infos fichier */}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-slate-800">{name}</p>
        <div className="mt-1 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            PDF
          </span>
          <span className="text-xs text-slate-400">{formatBytes(size)}</span>
        </div>

        {/* Barre de progression upload */}
        {uploading && (
          <div className="mt-3">
            <div className="flex items-center gap-2">
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                <div className="h-full animate-pulse rounded-full bg-blue-500" style={{ width: "60%" }} />
              </div>
              <span className="shrink-0 text-xs text-slate-400">Upload…</span>
            </div>
          </div>
        )}

        {/* Erreur upload */}
        {uploadError && (
          <p className="mt-2 text-xs text-red-600">{uploadError}</p>
        )}

        {/* Succès upload */}
        {!uploading && !uploadError && (
          <p className="mt-2 flex items-center gap-1 text-xs text-emerald-600">
            <svg
              xmlns="http://www.w3.org/2000/svg"
              viewBox="0 0 20 20"
              fill="currentColor"
              className="h-3.5 w-3.5"
              aria-hidden="true"
            >
              <path
                fillRule="evenodd"
                d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z"
                clipRule="evenodd"
              />
            </svg>
            Fichier prêt
          </p>
        )}
      </div>

      {/* Bouton supprimer */}
      {onRemove && !uploading && (
        <button
          type="button"
          onClick={onRemove}
          aria-label="Retirer le fichier"
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="h-4 w-4"
            aria-hidden="true"
          >
            <path d="M6.28 5.22a.75.75 0 0 0-1.06 1.06L8.94 10l-3.72 3.72a.75.75 0 1 0 1.06 1.06L10 11.06l3.72 3.72a.75.75 0 1 0 1.06-1.06L11.06 10l3.72-3.72a.75.75 0 0 0-1.06-1.06L10 8.94 6.28 5.22Z" />
          </svg>
        </button>
      )}
    </div>
  )
}
