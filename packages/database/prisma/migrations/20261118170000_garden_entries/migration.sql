CREATE TYPE "GardenEntryKind" AS ENUM ('TENDED', 'UNTENDED');

CREATE TABLE "garden_entries" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "subject_id" TEXT NOT NULL,
  "kind" "GardenEntryKind" NOT NULL,
  "occurred_on" DATE NOT NULL,
  "source_event_id" TEXT NOT NULL,
  "recorded_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "garden_entries_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "garden_entries_source_event_id_key" ON "garden_entries"("source_event_id");
CREATE INDEX "garden_entries_owner_id_occurred_on_idx" ON "garden_entries"("owner_id", "occurred_on");
CREATE INDEX "garden_entries_subject_id_occurred_on_idx" ON "garden_entries"("subject_id", "occurred_on");

ALTER TABLE "garden_entries" ADD CONSTRAINT "garden_entries_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX "garden_subjects_id_owner_id_key" ON "garden_subjects"("id", "owner_id");
ALTER TABLE "garden_entries" ADD CONSTRAINT "garden_entries_subject_id_owner_id_fkey" FOREIGN KEY ("subject_id", "owner_id") REFERENCES "garden_subjects"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;
