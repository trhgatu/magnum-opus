-- AlterTable
ALTER TABLE "garden_subjects" ADD COLUMN "name" TEXT;

-- Tên hiện tại của Habit; chủ thể không còn nguồn thì giữ tên lúc gieo.
-- Chưa NOT NULL: CI migrate trước khi deploy, server cũ vẫn gieo cây không
-- có name trong lúc chuyển. G2b đặt NOT NULL khi server mới đã chạy.
UPDATE "garden_subjects" s
SET "name" = COALESCE(
  (SELECT h."title" FROM "habits" h
   WHERE s."subject_kind" = 'HABIT' AND h."id" = s."subject_id"),
  s."name_at_planting"
);
