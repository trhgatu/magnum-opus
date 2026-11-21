-- Đồng bộ lại tên cho mọi cây rồi mới bắt buộc: trong lúc deploy G2a, server
-- cũ có thể đã gieo cây không có name, hoặc đổi tên Habit mà không phát
-- HabitRenamed. Chủ thể không còn nguồn thì giữ tên lúc gieo.
UPDATE "garden_subjects" s
SET "name" = COALESCE(
  (SELECT h."title" FROM "habits" h
   WHERE s."subject_kind" = 'HABIT' AND h."id" = s."subject_id"),
  s."name_at_planting"
);

-- AlterTable
ALTER TABLE "garden_subjects" ALTER COLUMN "name" SET NOT NULL;
