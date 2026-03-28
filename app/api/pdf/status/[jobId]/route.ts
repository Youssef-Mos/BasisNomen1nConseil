/**
 * GET /api/pdf/status/[jobId]
 *
 * Retourne l'état courant d'un job d'analyse.
 * Utilisé par le front-end en mode polling.
 *
 * Réponse : PipelineJob
 */

import { notFound, ok } from "@/lib/api"
import { getJob } from "@/lib/job-store"

type Params = Promise<{ jobId: string }>

export async function GET(
  _request: Request,
  { params }: { params: Params }
) {
  const { jobId } = await params
  const job = getJob(jobId)

  if (!job) {
    return notFound(`Job introuvable : ${jobId}`)
  }

  return ok(job)
}
