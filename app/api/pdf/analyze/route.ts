/**
 * POST /api/pdf/analyze
 *
 * Lance le pipeline Python d'analyse pour un PDF déjà uploadé.
 * Crée un job de suivi et retourne son identifiant.
 *
 * Body : { filename: string }
 * Réponse : { jobId: string }
 */

import { spawn } from "child_process"
import { join, basename } from "path"
import { existsSync } from "fs"
import { badRequest, ok, serverError } from "@/lib/api"
import {
  createJob,
  getJob,
  setJobStepStatus,
  setJobComplete,
  setJobError,
} from "@/lib/job-store"
import type { PipelineStepId } from "@/lib/types"

/** Chemin vers l'exécutable Python (configurable via variable d'env). */
const PYTHON_BIN = process.env.PYTHON_PATH ?? "python3"

/** Événement émis par pipeline_single.py sur stdout. */
type PipelineEvent =
  | { event: "step_start"; step: string; label: string }
  | { event: "step_end";   step: string; label: string }
  | { event: "error";      step: string; message: string }
  | { event: "complete";   document_id: string }

export async function POST(request: Request) {
  try {
    const body = await request.json() as { filename?: unknown }

    if (!body.filename || typeof body.filename !== "string") {
      return badRequest("Le champ « filename » est requis.")
    }

    // Sécurité : on rejette tout chemin contenant des séquences de traversée
    const filename = basename(body.filename)
    if (filename !== body.filename) {
      return badRequest("Nom de fichier invalide.")
    }

    const pdfPath = join(process.cwd(), "pdf-doc", filename)
    if (!existsSync(pdfPath)) {
      return badRequest(`Fichier introuvable : ${filename}`)
    }

    // Création du job de suivi
    const job = createJob()

    // Lancement du script Python en arrière-plan (non bloquant)
    launchPipeline(job.jobId, pdfPath)

    return ok({ jobId: job.jobId })
  } catch {
    return serverError("Impossible de démarrer l'analyse.")
  }
}

// ---------------------------------------------------------------------------
// Lancement asynchrone du pipeline Python
// ---------------------------------------------------------------------------

function launchPipeline(jobId: string, pdfPath: string): void {
  const scriptPath = join(process.cwd(), "python-pipeline", "pipeline_single.py")

  const proc = spawn(PYTHON_BIN, [scriptPath, "--file", pdfPath], {
    env: {
      ...process.env,
      PYTHONPATH: join(process.cwd(), "python-pipeline"),
      PYTHONUNBUFFERED: "1",
    },
    stdio: ["ignore", "pipe", "pipe"],
  })

  let stdoutBuffer = ""

  proc.stdout.on("data", (chunk: Buffer) => {
    stdoutBuffer += chunk.toString("utf8")
    const lines = stdoutBuffer.split("\n")
    // La dernière ligne peut être incomplète — on la conserve dans le buffer
    stdoutBuffer = lines.pop() ?? ""

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed) continue
      try {
        const evt = JSON.parse(trimmed) as PipelineEvent
        handleEvent(jobId, evt)
      } catch {
        // Ligne non-JSON (log Python) — on l'ignore
      }
    }
  })

  proc.stderr.on("data", (_chunk: Buffer) => {
    // Les erreurs Python arrivent sur stderr.
    // Les erreurs métier sont remontées via les événements JSON sur stdout.
  })

  proc.on("close", (code) => {
    if (code !== 0) {
      const job = getJob(jobId)
      if (job && job.status !== "success" && job.status !== "error") {
        setJobError(jobId, "finalize", `Le processus Python a terminé avec le code ${code}.`)
      }
    }
  })

  proc.on("error", (err) => {
    setJobError(jobId, "init", `Impossible de lancer Python : ${err.message}`)
  })
}

function handleEvent(jobId: string, evt: PipelineEvent): void {
  const stepId = (evt as { step?: string }).step as PipelineStepId | undefined

  switch (evt.event) {
    case "step_start":
      if (stepId) setJobStepStatus(jobId, stepId, "running")
      break

    case "step_end":
      if (stepId) setJobStepStatus(jobId, stepId, "done")
      break

    case "error":
      if (stepId) setJobError(jobId, stepId, (evt as { message: string }).message)
      break

    case "complete":
      setJobComplete(jobId, (evt as { document_id: string }).document_id)
      break
  }
}
