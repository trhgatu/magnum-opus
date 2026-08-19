-- CreateEnum
CREATE TYPE "TimelineEntryType" AS ENUM ('JOURNAL_SEALED', 'MEMORY_CREATED');

-- CreateTable
CREATE TABLE "reflection_timeline_entries" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "entry_type" "TimelineEntryType" NOT NULL,
    "source_id" TEXT NOT NULL,
    "occurred_on" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reflection_timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "reflection_timeline_entries_owner_id_occurred_on_idx" ON "reflection_timeline_entries"("owner_id", "occurred_on" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "reflection_timeline_entries_entry_type_source_id_key" ON "reflection_timeline_entries"("entry_type", "source_id");
