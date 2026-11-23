-- AlterTable
ALTER TABLE "garden_subjects" ADD COLUMN "bed_id" TEXT;
ALTER TABLE "garden_subjects" ADD COLUMN "bed_name" TEXT;

-- Luống chốt ở lần đầu Habit vào một Routine (BR-GDN-008): nạp từ lịch sử
-- thành viên, lấy khoảng mở sớm nhất. Cây chưa từng vào Routine thì đứng dọc
-- lối đá (bed_id null).
UPDATE "garden_subjects" s
SET "bed_id" = first."routine_id", "bed_name" = first."title"
FROM (
  SELECT DISTINCT ON (m."habit_id") m."habit_id", m."routine_id", r."title"
  FROM "routine_habit_memberships" m
  JOIN "routines" r ON r."id" = m."routine_id"
  ORDER BY m."habit_id", m."added_on", m."created_at", m."id"
) first
WHERE s."subject_kind" = 'HABIT' AND s."subject_id" = first."habit_id"
  AND s."bed_id" IS NULL;

-- Luống luôn có đủ id và tên, hoặc không có gì.
ALTER TABLE "garden_subjects"
  ADD CONSTRAINT "garden_subjects_bed_complete"
  CHECK (("bed_id" IS NULL) = ("bed_name" IS NULL));
