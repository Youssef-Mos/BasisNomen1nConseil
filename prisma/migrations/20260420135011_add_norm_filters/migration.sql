-- CreateTable
CREATE TABLE "norm_filters" (
    "id" TEXT NOT NULL,
    "normId" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "section" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "options" TEXT[],
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "norm_filters_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "norm_filters_normId_idx" ON "norm_filters"("normId");

-- CreateIndex
CREATE UNIQUE INDEX "norm_filters_normId_key_key" ON "norm_filters"("normId", "key");

-- AddForeignKey
ALTER TABLE "norm_filters" ADD CONSTRAINT "norm_filters_normId_fkey" FOREIGN KEY ("normId") REFERENCES "norms"("id") ON DELETE CASCADE ON UPDATE CASCADE;
