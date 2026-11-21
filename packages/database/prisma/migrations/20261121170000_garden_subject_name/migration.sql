-- AlterTable
ALTER TABLE "garden_subjects" ADD COLUMN "name" TEXT;

-- Tên hiện tại của Habit; chủ thể không còn nguồn thì giữ tên lúc gieo.
UPDATE "garden_subjects" SET "name" = "name_at_planting";
UPDATE "garden_subjects" s
SET "name" = h."title"
FROM "habits" h
WHERE s."subject_kind" = 'HABIT' AND s."subject_id" = h."id";

ALTER TABLE "garden_subjects" ALTER COLUMN "name" SET NOT NULL;

