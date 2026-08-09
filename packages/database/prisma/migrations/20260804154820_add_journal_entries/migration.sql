-- CreateEnum
CREATE TYPE "JournalEntryState" AS ENUM ('DRAFT', 'SEALED', 'TRASHED');

-- CreateTable
CREATE TABLE "journal_entries" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" VARCHAR(200),
    "content" TEXT NOT NULL DEFAULT '',
    "state" "JournalEntryState" NOT NULL DEFAULT 'DRAFT',
    "state_before_trash" "JournalEntryState",
    "revision" INTEGER NOT NULL DEFAULT 1,
    "trashed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "journal_entries_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "journal_entries"
ADD CONSTRAINT "journal_entries_lifecycle_check"
CHECK (
  (
    "state" = 'TRASHED'
    AND "state_before_trash" IN ('DRAFT', 'SEALED')
    AND "trashed_at" IS NOT NULL
  )
  OR
  (
    "state" IN ('DRAFT', 'SEALED')
    AND "state_before_trash" IS NULL
    AND "trashed_at" IS NULL
  )
);
-- CreateIndex
CREATE INDEX "journal_entries_owner_id_state_updated_at_idx" ON "journal_entries"("owner_id", "state", "updated_at" DESC);

-- AddForeignKey
ALTER TABLE "journal_entries" ADD CONSTRAINT "journal_entries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
