import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/norms — list all norms
export async function GET() {
  const norms = await prisma.norm.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, description: true, country: true },
  });
  return NextResponse.json(norms);
}

// POST /api/norms — create a new norm
export async function POST(request: NextRequest) {
  const body = await request.json() as { name?: string; description?: string; country?: string };

  if (!body.name || typeof body.name !== "string" || !body.name.trim()) {
    return NextResponse.json({ error: "'name' is required." }, { status: 400 });
  }

  const norm = await prisma.norm.create({
    data: {
      name: body.name.trim(),
      description: body.description?.trim() || null,
      country: body.country?.trim() || "BE",
    },
    select: { id: true, name: true, description: true, country: true },
  });

  return NextResponse.json(norm, { status: 201 });
}
