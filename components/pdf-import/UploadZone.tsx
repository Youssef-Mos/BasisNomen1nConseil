"use client"

/**
 * components/pdf-import/UploadZone.tsx
 *
 * Zone de drag-and-drop pour le téléversement d'un PDF.
 * Gère la sélection, le glisser-déposer et la validation immédiate.
 */

import React, { useCallback, useRef, useState } from "react"

type UploadZoneProps = {
  onFileSelected: (file: File) => void
  disabled?: boolean
}

const MAX_FILE_SIZE = 200 * 1024 * 1024 // 200 Mo

export function UploadZone({ onFileSelected, disabled = false }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [validationError, setValidationError] = useState<string | null>(null)

  const validateAndSelect = useCallback(
    (file: File) => {
      setValidationError(null)

      if (!file.name.toLowerCase().endsWith(".pdf")) {
        setValidationError("Seuls les fichiers PDF sont acceptés.")
        return
      }
      if (file.size > MAX_FILE_SIZE) {
        setValidationError(
          `Le fichier dépasse la taille maximale de ${MAX_FILE_SIZE / 1024 / 1024} Mo.`
        )
        return
      }

      onFileSelected(file)
    },
    [onFileSelected]
  )

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLDivElement>) => {
      e.preventDefault()
      setIsDragging(false)
      if (disabled) return
      const file = e.dataTransfer.files[0]
      if (file) validateAndSelect(file)
    },
    [disabled, validateAndSelect]
  )

  const handleDragOver = useCallback((e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault()
    if (!disabled) setIsDragging(true)
  }, [disabled])

  const handleDragLeave = useCallback(() => {
    setIsDragging(false)
  }, [])

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0]
      if (file) validateAndSelect(file)
      // Reset input so same file can be selected again
      e.target.value = ""
    },
    [validateAndSelect]
  )

  return (
    <div className="space-y-3">
      <div
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onClick={() => !disabled && inputRef.current?.click()}
        role="button"
        tabIndex={disabled ? -1 : 0}
        onKeyDown={(e) => {
          if (!disabled && (e.key === "Enter" || e.key === " ")) {
            inputRef.current?.click()
          }
        }}
        aria-label="Zone de dépôt de fichier PDF"
        className={[
          "relative flex flex-col items-center justify-center gap-5",
          "rounded-2xl border-2 border-dashed px-8 py-16",
          "cursor-pointer transition-all duration-200 select-none",
          isDragging
            ? "border-blue-500 bg-blue-50/60 scale-[1.01]"
            : "border-slate-200 bg-slate-50/50 hover:border-slate-300 hover:bg-slate-50",
          disabled ? "opacity-50 cursor-not-allowed" : "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {/* Icône */}
        <div
          className={[
            "flex h-16 w-16 items-center justify-center rounded-2xl transition-colors duration-200",
            isDragging ? "bg-blue-100 text-blue-600" : "bg-slate-100 text-slate-400",
          ].join(" ")}
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.5}
            className="h-8 w-8"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5a3.375 3.375 0 0 0-3.375-3.375H8.25m6.75 12-3-3m0 0-3 3m3-3v6m-1.5-15H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z"
            />
          </svg>
        </div>

        {/* Texte */}
        <div className="text-center">
          <p className="text-base font-medium text-slate-700">
            {isDragging ? "Relâchez pour importer" : "Glissez-déposez votre PDF ici"}
          </p>
          <p className="mt-1 text-sm text-slate-400">ou</p>
        </div>

        {/* Bouton secondaire */}
        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            inputRef.current?.click()
          }}
          className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-medium text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Choisir un fichier
        </button>

        <p className="text-xs text-slate-400">PDF uniquement · Max 200 Mo</p>

        <input
          ref={inputRef}
          type="file"
          accept=".pdf,application/pdf"
          className="sr-only"
          onChange={handleInputChange}
          disabled={disabled}
          aria-hidden="true"
        />
      </div>

      {/* Message d'erreur de validation */}
      {validationError && (
        <div
          role="alert"
          className="flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 20 20"
            fill="currentColor"
            className="mt-0.5 h-4 w-4 shrink-0 text-red-500"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M18 10a8 8 0 1 1-16 0 8 8 0 0 1 16 0Zm-8-5a.75.75 0 0 1 .75.75v4.5a.75.75 0 0 1-1.5 0v-4.5A.75.75 0 0 1 10 5Zm0 10a1 1 0 1 0 0-2 1 1 0 0 0 0 2Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-sm text-red-700">{validationError}</p>
        </div>
      )}
    </div>
  )
}
