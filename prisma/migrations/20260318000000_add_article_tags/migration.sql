-- AlterTable: add tags column to articles with default empty array
ALTER TABLE "public"."articles" ADD COLUMN "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
