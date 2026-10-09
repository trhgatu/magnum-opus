-- CreateTable
CREATE TABLE "routine_habit_memberships" (
    "id" TEXT NOT NULL,
    "routine_id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "added_on" DATE NOT NULL,
    "removed_on" DATE,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_habit_memberships_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "routine_habit_memberships_routine_id_added_on_idx" ON "routine_habit_memberships"("routine_id", "added_on");

-- CreateIndex
CREATE INDEX "routine_habit_memberships_habit_id_idx" ON "routine_habit_memberships"("habit_id");

-- AddForeignKey
ALTER TABLE "routine_habit_memberships" ADD CONSTRAINT "routine_habit_memberships_routine_id_owner_id_fkey" FOREIGN KEY ("routine_id", "owner_id") REFERENCES "routines"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_habit_memberships" ADD CONSTRAINT "routine_habit_memberships_habit_id_owner_id_fkey" FOREIGN KEY ("habit_id", "owner_id") REFERENCES "habits"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;


-- Bất biến 02-domain-analysis.md §5: tối đa 1 khoảng thành viên đang mở /
-- cặp (routine, habit), và khoảng [added_on, removed_on) hợp lệ. Prisma schema
-- không biểu diễn được partial index lẫn CHECK, nên chúng chỉ tồn tại ở đây
-- (xem comment cạnh model RoutineHabitMembership trong schema.prisma).
CREATE UNIQUE INDEX "routine_habit_memberships_one_open_per_pair"
  ON "routine_habit_memberships" ("routine_id", "habit_id") WHERE "removed_on" IS NULL;

ALTER TABLE "routine_habit_memberships"
  ADD CONSTRAINT "routine_habit_memberships_valid_range"
  CHECK ("removed_on" IS NULL OR "removed_on" >= "added_on");

-- Backfill (02-domain-analysis.md §6): mỗi RoutineHabit hiện có → 1 khoảng
-- đang mở. Gần đúng: không có ngày thêm thật, nên lấy ngày muộn hơn giữa lúc
-- tạo Routine và lúc tạo Habit; các lần gỡ trước migration không còn dữ liệu.
INSERT INTO "routine_habit_memberships"
  ("id", "routine_id", "habit_id", "owner_id", "added_on", "removed_on")
SELECT gen_random_uuid()::text, rh."routine_id", rh."habit_id", rh."owner_id",
       GREATEST(r."created_on", h."created_on"), NULL
FROM "routine_habits" rh
JOIN "routines" r ON r."id" = rh."routine_id"
JOIN "habits" h ON h."id" = rh."habit_id";
