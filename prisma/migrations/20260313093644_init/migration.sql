-- CreateTable
CREATE TABLE "public"."documents" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "pdfPath" TEXT NOT NULL,
    "fileHash" TEXT NOT NULL,
    "language" TEXT NOT NULL DEFAULT 'fr',
    "version" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "documents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."articles" (
    "id" TEXT NOT NULL,
    "documentId" TEXT NOT NULL,
    "parentId" TEXT,
    "title" TEXT,
    "slug" TEXT NOT NULL,
    "level" INTEGER NOT NULL,
    "orderIndex" INTEGER NOT NULL,
    "pageStart" INTEGER NOT NULL,
    "pageEnd" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "articles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."pdf_zones" (
    "id" TEXT NOT NULL,
    "articleId" TEXT NOT NULL,
    "page" INTEGER NOT NULL,
    "x" DOUBLE PRECISION NOT NULL,
    "y" DOUBLE PRECISION NOT NULL,
    "width" DOUBLE PRECISION NOT NULL,
    "height" DOUBLE PRECISION NOT NULL,
    "imagePath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "pdf_zones_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "public"."ocr_texts" (
    "id" TEXT NOT NULL,
    "zoneId" TEXT NOT NULL,
    "text" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ocr_texts_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "documents_fileHash_key" ON "public"."documents"("fileHash");

-- CreateIndex
CREATE INDEX "documents_language_idx" ON "public"."documents"("language");

-- CreateIndex
CREATE INDEX "documents_createdAt_idx" ON "public"."documents"("createdAt");

-- CreateIndex
CREATE INDEX "articles_documentId_orderIndex_idx" ON "public"."articles"("documentId", "orderIndex");

-- CreateIndex
CREATE INDEX "articles_documentId_level_idx" ON "public"."articles"("documentId", "level");

-- CreateIndex
CREATE INDEX "articles_parentId_idx" ON "public"."articles"("parentId");

-- CreateIndex
CREATE UNIQUE INDEX "articles_documentId_slug_key" ON "public"."articles"("documentId", "slug");

-- CreateIndex
CREATE INDEX "pdf_zones_articleId_idx" ON "public"."pdf_zones"("articleId");

-- CreateIndex
CREATE INDEX "pdf_zones_articleId_page_idx" ON "public"."pdf_zones"("articleId", "page");

-- CreateIndex
CREATE UNIQUE INDEX "ocr_texts_zoneId_key" ON "public"."ocr_texts"("zoneId");

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_documentId_fkey" FOREIGN KEY ("documentId") REFERENCES "public"."documents"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."articles" ADD CONSTRAINT "articles_parentId_fkey" FOREIGN KEY ("parentId") REFERENCES "public"."articles"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."pdf_zones" ADD CONSTRAINT "pdf_zones_articleId_fkey" FOREIGN KEY ("articleId") REFERENCES "public"."articles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "public"."ocr_texts" ADD CONSTRAINT "ocr_texts_zoneId_fkey" FOREIGN KEY ("zoneId") REFERENCES "public"."pdf_zones"("id") ON DELETE CASCADE ON UPDATE CASCADE;
