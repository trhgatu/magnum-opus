-- Habit V4 (BA forge/habit/v4): is_active → state, chuẩn bị Thùng rác.
-- Theo mẫu journal_entries: state quyết định, state_before_trash nhớ chỗ
-- quay về, trashed_at chỉ ghi thời điểm.

-- CreateEnum
CREATE TYPE "HabitState" AS ENUM ('ACTIVE', 'ARCHIVED', 'TRASHED');

-- AlterTable
ALTER TABLE "habits"
ADD COLUMN "state" "HabitState" NOT NULL DEFAULT 'ACTIVE',
ADD COLUMN "state_before_trash" "HabitState",
ADD COLUMN "trashed_at" TIMESTAMP(3);

-- Chuyển dữ liệu: is_active = false là đã lưu trữ.
UPDATE "habits" SET "state" = 'ARCHIVED' WHERE "is_active" = false;

-- DropIndex
DROP INDEX "habits_owner_id_is_active_idx";

-- AlterTable
ALTER TABLE "habits" DROP COLUMN "is_active";

-- CreateIndex
CREATE INDEX "habits_owner_id_state_idx" ON "habits"("owner_id", "state");

ALTER TABLE "habits"
ADD CONSTRAINT "habits_lifecycle_check"
CHECK (
  (
    "state" = 'TRASHED'
    AND "state_before_trash" IN ('ACTIVE', 'ARCHIVED')
    AND "trashed_at" IS NOT NULL
  )
  OR
  (
    "state" IN ('ACTIVE', 'ARCHIVED')
    AND "state_before_trash" IS NULL
    AND "trashed_at" IS NULL
  )
);
