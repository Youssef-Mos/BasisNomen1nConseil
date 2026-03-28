/**
 * POST /api/pdf/upload
 *
 * Reçoit un fichier PDF en multipart/form-data (champ "file")
 * et le sauvegarde dans le dossier pdf-doc/ à la racine du projet.
 *
 * Réponse : UploadedFile
 */

import { writeFile, mkdir } from "fs/promises"
import { join, extname, basename } from "path"
import { randomUUID } from "crypto"
import { badRequest, ok, serverError } from "@/lib/api"
import type { UploadedFile } from "@/lib/types"

/** Taille maximale acceptée : 200 Mo */
const MAX_FILE_SIZE = 200 * 1024 * 1024

export async function POST(request: Request) {
  try {
    const contentType = request.headers.get("content-type") ?? ""
    if (!contentType.includes("multipart/form-data")) {
      return badRequest("Le contenu doit être multipart/form-data.")
    }

    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || typeof file === "string") {
      return badRequest("Aucun fichier fourni (champ « file » manquant).")
    }

    const blob = file as File

    // Vérification de l'extension
    const ext = extname(blob.name).toLowerCase()
    if (ext !== ".pdf") {
      return badRequest("Seuls les fichiers PDF sont acceptés.")
    }

    // Vérification de la taille
    if (blob.size > MAX_FILE_SIZE) {
      return badRequest(
        `Le fichier dépasse la taille maximale de ${MAX_FILE_SIZE / 1024 / 1024} Mo.`
      )
    }

    // Vérification du type MIME
    if (blob.type && !blob.type.includes("pdf")) {
      return badRequest("Le type MIME du fichier n'est pas PDF.")
    }

    // Lecture et vérification des magic bytes PDF (%PDF-)
    const buffer = Buffer.from(await blob.arrayBuffer())
    if (buffer.length < 5 || buffer.toString("ascii", 0, 5) !== "%PDF-") {
      return badRequest("Le fichier n'est pas un PDF valide.")
    }

    // Génération d'un nom de fichier sûr et unique
    const originalName = basename(blob.name)
    const safeStem = originalName
      .replace(ext, "")
      .replace(/[^a-zA-Z0-9_\-]/g, "_")
      .slice(0, 80)
    const filename = `${safeStem}_${randomUUID().slice(0, 8)}.pdf`

    // Sauvegarde dans pdf-doc/
    const pdfDir = join(process.cwd(), "pdf-doc")
    await mkdir(pdfDir, { recursive: true })
    await writeFile(join(pdfDir, filename), buffer)

    const result: UploadedFile = {
      filename,
      originalName,
      size: blob.size,
    }

    return ok(result)
  } catch {
    return serverError("Erreur lors de l'upload du fichier.")
  }
}
