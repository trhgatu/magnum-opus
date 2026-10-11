-- CreateTable
CREATE TABLE "habit_schedule_versions" (
    "id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "frequency_type" "HabitFrequencyType" NOT NULL,
    "frequency_days" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "effective_from" DATE NOT NULL,
    "effective_to" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_schedule_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habit_schedule_versions_habit_id_effective_from_idx" ON "habit_schedule_versions"("habit_id", "effective_from");

-- CreateIndex
CREATE INDEX "habit_schedule_versions_owner_id_effective_from_idx" ON "habit_schedule_versions"("owner_id", "effective_from");

-- AddForeignKey
ALTER TABLE "habit_schedule_versions" ADD CONSTRAINT "habit_schedule_versions_habit_id_owner_id_fkey" FOREIGN KEY ("habit_id", "owner_id") REFERENCES "habits"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Bất biến 02-domain-analysis.md §5: tối đa 1 phiên bản đang mở / Habit, và
-- khoảng [effective_from, effective_to) hợp lệ. Prisma schema không biểu diễn
-- được partial index lẫn CHECK, nên chúng chỉ tồn tại ở đây (xem comment cạnh
-- model HabitScheduleVersion trong schema.prisma).
CREATE UNIQUE INDEX "habit_schedule_versions_one_open_per_habit"
  ON "habit_schedule_versions" ("habit_id") WHERE "effective_to" IS NULL;

ALTER TABLE "habit_schedule_versions"
  ADD CONSTRAINT "habit_schedule_versions_valid_range"
  CHECK ("effective_to" IS NULL OR "effective_to" >= "effective_from");

-- Backfill (02-domain-analysis.md §6): mỗi Habit BUILD có 1 phiên bản đang mở
-- [created_on, null) với tần suất HIỆN TẠI. Gần đúng: các lần đổi tần suất
-- trước migration không còn dữ liệu. Habit đang archive vẫn được backfill —
-- archive thể hiện ở lifecycle history, không ở phiên bản tần suất.
INSERT INTO "habit_schedule_versions"
  ("id", "habit_id", "owner_id", "frequency_type", "frequency_days",
   "effective_from", "effective_to")
SELECT gen_random_uuid()::text, h."id", h."owner_id", h."frequency_type",
       h."frequency_days", h."created_on", NULL
FROM "habits" h
WHERE h."type" = 'BUILD'::"HabitType" AND h."frequency_type" IS NOT NULL;
