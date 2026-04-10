import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/rectangles/types
 *
 * Returns the distinct list of type values currently used in the rectangles table.
 * Used to populate the type dropdown in the admin UI.
 */
export async function GET() {
  const rows = await prisma.rectangle.findMany({
    select: { type: true },
    distinct: ["type"],
    orderBy: { type: "asc" },
  });

  return NextResponse.json({ types: rows.map((r) => r.type) });
}
