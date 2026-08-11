-- CreateEnum
CREATE TYPE "MoodLabel" AS ENUM ('JOYFUL', 'CALM', 'HOPEFUL', 'ENERGETIC', 'NEUTRAL', 'TIRED', 'ANXIOUS', 'SAD', 'ANGRY', 'OVERWHELMED');

-- CreateTable
CREATE TABLE "moods" (
    "id" TEXT NOT NULL,
    "journal_entry_id" TEXT NOT NULL,
    "label" "MoodLabel" NOT NULL,
    "intensity" INTEGER,
    "note" VARCHAR(500),
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "moods_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "moods"
ADD CONSTRAINT "moods_intensity_check"
CHECK (
  "intensity" IS NULL
  OR "intensity" BETWEEN 1 AND 5
);

-- CreateIndex
CREATE UNIQUE INDEX "moods_journal_entry_id_key" ON "moods"("journal_entry_id");

-- AddForeignKey
ALTER TABLE "moods" ADD CONSTRAINT "moods_journal_entry_id_fkey" FOREIGN KEY ("journal_entry_id") REFERENCES "journal_entries"("id") ON DELETE CASCADE ON UPDATE CASCADE;
