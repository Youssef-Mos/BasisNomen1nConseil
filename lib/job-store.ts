/**
 * lib/job-store.ts — Store en mémoire pour le suivi des jobs d'analyse PDF.
 *
 * Utilise le global Node.js pour persister entre les rechargements à chaud
 * (hot-reload) en développement.
 */

import { randomUUID } from "crypto"
import type { PipelineJob, PipelineStepId, StepStatus } from "./types"

// ---------------------------------------------------------------------------
// Labels et ordre des étapes
// ---------------------------------------------------------------------------

const STEP_LABELS: Record<PipelineStepId, string> = {
  init:              "Initialisation…",
  create_document:   "Enregistrement du PDF…",
  extract_pages:     "Extraction des pages…",
  extract_structure: "Analyse de la structure…",
  detect_articles:   "Détection des articles…",
  build_hierarchy:   "Construction de la hiérarchie…",
  extract_zones:     "Extraction des zones visuelles…",
  run_ocr:           "Extraction OCR…",
  finalize:          "Finalisation…",
}

const STEP_ORDER: PipelineStepId[] = [
  "init",
  "create_document",
  "extract_pages",
  "extract_structure",
  "detect_articles",
  "build_hierarchy",
  "extract_zones",
  "run_ocr",
  "finalize",
]

// ---------------------------------------------------------------------------
// Singleton Map (persisté dans global pour survivre au hot-reload)
// ---------------------------------------------------------------------------

const g = global as unknown as { __pipelineJobs?: Map<string, PipelineJob> }
if (!g.__pipelineJobs) {
  g.__pipelineJobs = new Map()
}
const jobs: Map<string, PipelineJob> = g.__pipelineJobs

// ---------------------------------------------------------------------------
// API publique
// ---------------------------------------------------------------------------

export function createJob(): PipelineJob {
  const jobId = randomUUID()
  const job: PipelineJob = {
    jobId,
    status: "queued",
    progress: 0,
    steps: STEP_ORDER.map((id) => ({
      id,
      label: STEP_LABELS[id],
      status: "pending",
    })),
    startedAt: new Date().toISOString(),
  }
  jobs.set(jobId, job)
  return job
}

export function getJob(jobId: string): PipelineJob | undefined {
  return jobs.get(jobId)
}

export function setJobStepStatus(
  jobId: string,
  stepId: PipelineStepId,
  status: StepStatus
): void {
  const job = jobs.get(jobId)
  if (!job) return

  const step = job.steps.find((s) => s.id === stepId)
  if (step) step.status = status

  if (job.status !== "error") {
    job.status = "running"
  }

  job.progress = computeProgress(job.steps)
  jobs.set(jobId, { ...job, steps: [...job.steps] })
}

export function setJobComplete(jobId: string, documentId: string): void {
  const job = jobs.get(jobId)
  if (!job) return

  job.status = "success"
  job.progress = 100
  job.documentId = documentId
  job.finishedAt = new Date().toISOString()

  for (const step of job.steps) {
    if (step.status !== "error") step.status = "done"
  }

  jobs.set(jobId, { ...job, steps: [...job.steps] })
}

export function setJobError(
  jobId: string,
  stepId: PipelineStepId,
  message: string
): void {
  const job = jobs.get(jobId)
  if (!job) return

  job.status = "error"
  job.error = message
  job.errorStep = stepId
  job.finishedAt = new Date().toISOString()

  const step = job.steps.find((s) => s.id === stepId)
  if (step) step.status = "error"

  jobs.set(jobId, { ...job, steps: [...job.steps] })
}

// ---------------------------------------------------------------------------
// Helper interne
// ---------------------------------------------------------------------------

function computeProgress(steps: PipelineJob["steps"]): number {
  const total = steps.length
  if (total === 0) return 0
  const doneCount = steps.filter((s) => s.status === "done").length
  const running   = steps.some((s) => s.status === "running") ? 0.5 : 0
  return Math.min(99, Math.round(((doneCount + running) / total) * 100))
}
