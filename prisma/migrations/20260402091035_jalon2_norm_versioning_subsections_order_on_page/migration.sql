-- AlterEnum
-- This migration adds more than one value to an enum.
-- With PostgreSQL versions 11 and earlier, this is not possible
-- in a single migration. This can be worked around by creating
-- multiple migrations, each migration adding only one value to
-- the enum.


ALTER TYPE "RectangleType" ADD VALUE 'subsection';
ALTER TYPE "RectangleType" ADD VALUE 'subSubsection';
ALTER TYPE "RectangleType" ADD VALUE 'subSubSubsection';
ALTER TYPE "RectangleType" ADD VALUE 'subSubSubSubsection';
ALTER TYPE "RectangleType" ADD VALUE 'subSubSubSubSubsection';
ALTER TYPE "RectangleType" ADD VALUE 'subSubSubSubSubSubsection';

-- AlterTable
ALTER TABLE "documents" ADD COLUMN     "normId" TEXT,
ADD COLUMN     "version" TEXT;

-- AlterTable
ALTER TABLE "rectangles" ADD COLUMN     "orderOnPage" INTEGER;

-- CreateTable
CREATE TABLE "norms" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "country" TEXT NOT NULL DEFAULT 'BE',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "norms_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "documents_normId_idx" ON "documents"("normId");

-- AddForeignKey
ALTER TABLE "documents" ADD CONSTRAINT "documents_normId_fkey" FOREIGN KEY ("normId") REFERENCES "norms"("id") ON DELETE SET NULL ON UPDATE CASCADE;
