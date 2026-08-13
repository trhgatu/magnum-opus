-- CreateEnum
CREATE TYPE "MemoryState" AS ENUM ('ACTIVE', 'TRASHED');

-- CreateEnum
CREATE TYPE "MemoryDatePrecision" AS ENUM ('DAY', 'MONTH', 'YEAR', 'UNKNOWN');

-- CreateTable
CREATE TABLE "memories" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "source_journal_entry_id" TEXT,
    "title" VARCHAR(200) NOT NULL,
    "content" TEXT NOT NULL,
    "occurred_on" DATE,
    "occurred_on_precision" "MemoryDatePrecision" NOT NULL DEFAULT 'UNKNOWN',
    "state" "MemoryState" NOT NULL DEFAULT 'ACTIVE',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "trashed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "memories_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "memories_owner_id_state_occurred_on_idx" ON "memories"("owner_id", "state", "occurred_on" DESC);

-- CreateIndex
CREATE INDEX "memories_owner_id_state_updated_at_idx" ON "memories"("owner_id", "state", "updated_at" DESC);

-- CreateIndex
CREATE INDEX "memories_source_journal_entry_id_idx" ON "memories"("source_journal_entry_id");

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "memories" ADD CONSTRAINT "memories_source_journal_entry_id_fkey" FOREIGN KEY ("source_journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddCheckConstraints
ALTER TABLE "memories"
ADD CONSTRAINT "memories_revision_check"
CHECK ("revision" >= 1),

ADD CONSTRAINT "memories_state_trashed_at_check"
CHECK (
  (
    "state" = 'ACTIVE'
    AND "trashed_at" IS NULL
  )
  OR
  (
    "state" = 'TRASHED'
    AND "trashed_at" IS NOT NULL
  )
),

ADD CONSTRAINT "memories_occurred_on_precision_check"
CHECK (
  (
    "occurred_on_precision" = 'UNKNOWN'
    AND "occurred_on" IS NULL
  )
  OR
  (
    "occurred_on_precision" = 'DAY'
    AND "occurred_on" IS NOT NULL
  )
  OR
  (
    "occurred_on_precision" = 'MONTH'
    AND "occurred_on" IS NOT NULL
    AND EXTRACT(DAY FROM "occurred_on") = 1
  )
  OR
  (
    "occurred_on_precision" = 'YEAR'
    AND "occurred_on" IS NOT NULL
    AND EXTRACT(MONTH FROM "occurred_on") = 1
    AND EXTRACT(DAY FROM "occurred_on") = 1
  )
),

ADD CONSTRAINT "memories_title_not_blank_check"
CHECK (CHAR_LENGTH(BTRIM("title")) > 0),

ADD CONSTRAINT "memories_content_not_blank_check"
CHECK (CHAR_LENGTH(BTRIM("content")) > 0);