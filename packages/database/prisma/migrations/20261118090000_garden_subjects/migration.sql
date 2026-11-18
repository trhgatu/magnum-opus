-- Garden: mỗi chủ thể (Habit, sau này Project…) đã được gieo vào vườn.
CREATE TYPE "GardenSubjectKind" AS ENUM ('HABIT');
CREATE TYPE "GardenVariant" AS ENUM ('BUILD', 'QUIT');

CREATE TABLE "garden_subjects" (
  "id" TEXT NOT NULL,
  "owner_id" TEXT NOT NULL,
  "subject_kind" "GardenSubjectKind" NOT NULL,
  "subject_id" TEXT NOT NULL,
  "variant" "GardenVariant" NOT NULL,
  "name_at_planting" TEXT NOT NULL,
  "sim_version" INTEGER NOT NULL,
  "planted_on" DATE NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "garden_subjects_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "garden_subjects_subject_kind_subject_id_key"
  ON "garden_subjects"("subject_kind", "subject_id");
CREATE INDEX "garden_subjects_owner_id_idx" ON "garden_subjects"("owner_id");

ALTER TABLE "garden_subjects" ADD CONSTRAINT "garden_subjects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;
