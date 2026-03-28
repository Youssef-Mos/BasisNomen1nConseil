/*
  Warnings:

  - You are about to drop the column `language` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the column `version` on the `documents` table. All the data in the column will be lost.
  - You are about to drop the `articles` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `ocr_texts` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the `pdf_zones` table. If the table is not empty, all the data it contains will be lost.

*/
-- CreateEnum
CREATE TYPE "RectangleType" AS ENUM ('phrase', 'paragraph', 'article', 'section', 'figure', 'table', 'formula', 'annexe');

-- DropForeignKey
ALTER TABLE "articles" DROP CONSTRAINT "articles_documentId_fkey";

-- DropForeignKey
ALTER TABLE "articles" DROP CONSTRAINT "articles_parentId_fkey";

-- DropForeignKey
ALTER TABLE "ocr_texts" DROP CONSTRAINT "ocr_texts_zoneId_fkey";

-- DropForeignKey
ALTER TABLE "pdf_zones" DROP CONSTRAINT "pdf_zones_articleId_fkey";

-- DropIndex
DROP INDEX "documents_language_idx";

-- AlterTable
ALTER TABLE "documents" DROP COLUMN "language",
DROP COLUMN "version",
ADD COLUMN     "pageCount" INTEGER NOT NULL DEFAULT 0;

-- DropTable
DROP TABLE "articles";

-- DropTable
DROP TABLE "ocr_texts";

-- DropTable
DROP TABLE "pdf_zones";

-- CreateTable
CREATE TABLE "rectangles" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "fatherId" TEXT,
    "type" "RectangleType" NOT NULL DEFAULT 'paragraph',
    "labels" TEXT[],
    "textFr" TEXT,
    "textEn" TEXT,
    "textNl" TEXT,
    "page" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "rectangles_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "rectangles_documentId_idx" ON "rectangles"("documentId");

-- CreateIndex
CREATE INDEX "rectangles_documentId_page_idx" ON "rectangles"("documentId", "page");

-- CreateIndex
CREATE INDEX "rectangles_fatherId_idx" ON "rectangles"("fatherId");

-- AddForeignKey
ALTER TABLE "rectangles" ADD CONSTRAINT "rectangles_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "rectangles" ADD CONSTRAINT "rectangles_fatherId_fkey" FOREIGN KEY ("fatherId") REFERENCES "rectangles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
