/*
  Warnings:

  - The `type` column on the `rectangles` table would be dropped and recreated. This will lead to data loss if there is data in the column.

*/
-- AlterTable
ALTER TABLE "rectangles" DROP COLUMN "type",
ADD COLUMN     "type" TEXT NOT NULL DEFAULT 'paragraph';

-- DropEnum
DROP TYPE "RectangleType";
