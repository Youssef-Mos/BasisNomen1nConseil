/**
 * scripts/seed-filters.ts
 *
 * One-time migration script: inserts the previously-hardcoded filters from
 * FilterSidebar.tsx into the norm_filters table for every existing norm.
 *
 * Run:  npx tsx scripts/seed-filters.ts
 */

import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const SEED_FILTERS = [
  {
    key: "buildingHeightType",
    label: "Height type",
    section: "Building",
    type: "select",
    options: [
      "Low-rise (\u2264 10 m)",
      "Mid-rise (10 \u2013 25 m)",
      "High-rise (> 25 m)",
    ],
    sortOrder: 0,
  },
  {
    key: "compartmentCategory",
    label: "Compartment category",
    section: "Building",
    type: "select",
    options: [
      "Category A",
      "Category B",
      "Category C",
      "Category D",
      "Category E",
    ],
    sortOrder: 1,
  },
  {
    key: "roomCategory",
    label: "Room category",
    section: "Building",
    type: "select",
    options: [
      "Living space",
      "Bedroom",
      "Office",
      "Commercial",
      "Industrial",
      "Technical room",
      "Common area",
      "Circulation",
    ],
    sortOrder: 2,
  },
];

async function main() {
  const norms = await prisma.norm.findMany({ select: { id: true, name: true } });

  if (norms.length === 0) {
    console.log("No norms found in the database. Nothing to seed.");
    return;
  }

  console.log(`Found ${norms.length} norm(s). Seeding filters...`);

  for (const norm of norms) {
    for (const filter of SEED_FILTERS) {
      try {
        await prisma.normFilter.upsert({
          where: { normId_key: { normId: norm.id, key: filter.key } },
          update: {
            label: filter.label,
            section: filter.section,
            type: filter.type,
            options: filter.options,
            sortOrder: filter.sortOrder,
          },
          create: {
            normId: norm.id,
            ...filter,
          },
        });
        console.log(`  [${norm.name}] ${filter.key} — OK`);
      } catch (err) {
        console.error(`  [${norm.name}] ${filter.key} — FAILED:`, err);
      }
    }
  }

  console.log("Done.");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
