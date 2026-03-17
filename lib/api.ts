/**
 * lib/api.ts — Helpers pour les réponses des route handlers Next.js.
 *
 * Usage dans un route handler :
 *   import { ok, notFound } from "@/lib/api"
 *   return ok(data)
 *   return notFound("Document introuvable")
 */

import { NextResponse } from "next/server"

export const ok = <T>(data: T) =>
  NextResponse.json(data)

export const notFound = (message = "Not found") =>
  NextResponse.json({ error: message }, { status: 404 })

export const badRequest = (message = "Bad request") =>
  NextResponse.json({ error: message }, { status: 400 })

export const serverError = (message = "Internal server error") =>
  NextResponse.json({ error: message }, { status: 500 })
