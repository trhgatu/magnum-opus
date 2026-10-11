-- CreateEnum
CREATE TYPE "ForgeLifecycleAction" AS ENUM ('ARCHIVED', 'RESTORED');

-- AlterTable
-- createdOn: thêm nullable → backfill → NOT NULL. Câu `ADD COLUMN ... NOT NULL`
-- do Prisma sinh sẽ lỗi trên bảng đã có dữ liệu. Ngày lịch dùng
-- users.time_zone tại lúc migration (02-domain-analysis.md §6). created_at
-- lưu giờ UTC không kèm múi giờ, nên gắn UTC trước rồi mới đổi sang múi giờ
-- owner.
-- users.time_zone không phải múi giờ PostgreSQL nhận ra (giá trị cũ/sai) thì
-- `AT TIME ZONE` sẽ lỗi và hủy cả migration, nên múi giờ lạ quy về UTC qua
-- pg_timezone_names (gần đúng như mọi backfill khác ở đây).
ALTER TABLE "habits" ADD COLUMN     "created_on" DATE;

-- AlterTable
ALTER TABLE "routines" ADD COLUMN     "created_on" DATE;

WITH owner_zones AS (
  SELECT u."id", COALESCE(tz."name", 'UTC') AS "time_zone"
  FROM "users" u LEFT JOIN pg_timezone_names tz ON tz."name" = u."time_zone"
)
UPDATE "habits" h
SET "created_on" = (h."created_at" AT TIME ZONE 'UTC' AT TIME ZONE z."time_zone")::date
FROM owner_zones z WHERE z."id" = h."owner_id";

WITH owner_zones AS (
  SELECT u."id", COALESCE(tz."name", 'UTC') AS "time_zone"
  FROM "users" u LEFT JOIN pg_timezone_names tz ON tz."name" = u."time_zone"
)
UPDATE "routines" r
SET "created_on" = (r."created_at" AT TIME ZONE 'UTC' AT TIME ZONE z."time_zone")::date
FROM owner_zones z WHERE z."id" = r."owner_id";

ALTER TABLE "habits" ALTER COLUMN "created_on" SET NOT NULL;
ALTER TABLE "routines" ALTER COLUMN "created_on" SET NOT NULL;

-- CreateTable
CREATE TABLE "habit_lifecycle_transitions" (
    "id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "action" "ForgeLifecycleAction" NOT NULL,
    "effective_on" DATE NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_lifecycle_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_lifecycle_transitions" (
    "id" TEXT NOT NULL,
    "routine_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "action" "ForgeLifecycleAction" NOT NULL,
    "effective_on" DATE NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "routine_lifecycle_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habit_lifecycle_transitions_habit_id_effective_on_occurred__idx" ON "habit_lifecycle_transitions"("habit_id", "effective_on", "occurred_at");

-- CreateIndex
CREATE INDEX "habit_lifecycle_transitions_owner_id_effective_on_idx" ON "habit_lifecycle_transitions"("owner_id", "effective_on");

-- CreateIndex
CREATE INDEX "routine_lifecycle_transitions_routine_id_effective_on_occur_idx" ON "routine_lifecycle_transitions"("routine_id", "effective_on", "occurred_at");

-- CreateIndex
CREATE INDEX "routine_lifecycle_transitions_owner_id_effective_on_idx" ON "routine_lifecycle_transitions"("owner_id", "effective_on");

-- AddForeignKey
ALTER TABLE "habit_lifecycle_transitions" ADD CONSTRAINT "habit_lifecycle_transitions_habit_id_owner_id_fkey" FOREIGN KEY ("habit_id", "owner_id") REFERENCES "habits"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_lifecycle_transitions" ADD CONSTRAINT "routine_lifecycle_transitions_routine_id_owner_id_fkey" FOREIGN KEY ("routine_id", "owner_id") REFERENCES "routines"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill ARCHIVED cho Habit/Routine đang archive (02-domain-analysis.md §6).
-- Gần đúng: updated_at là thay đổi cuối, thường chính là lần archive.
WITH owner_zones AS (
  SELECT u."id", COALESCE(tz."name", 'UTC') AS "time_zone"
  FROM "users" u LEFT JOIN pg_timezone_names tz ON tz."name" = u."time_zone"
)
INSERT INTO "habit_lifecycle_transitions"
  ("id", "habit_id", "owner_id", "action", "effective_on", "occurred_at")
SELECT gen_random_uuid()::text, h."id", h."owner_id", 'ARCHIVED'::"ForgeLifecycleAction",
       (h."updated_at" AT TIME ZONE 'UTC' AT TIME ZONE z."time_zone")::date,
       h."updated_at"
FROM "habits" h JOIN owner_zones z ON z."id" = h."owner_id"
WHERE h."is_active" = false;

WITH owner_zones AS (
  SELECT u."id", COALESCE(tz."name", 'UTC') AS "time_zone"
  FROM "users" u LEFT JOIN pg_timezone_names tz ON tz."name" = u."time_zone"
)
INSERT INTO "routine_lifecycle_transitions"
  ("id", "routine_id", "owner_id", "action", "effective_on", "occurred_at")
SELECT gen_random_uuid()::text, r."id", r."owner_id", 'ARCHIVED'::"ForgeLifecycleAction",
       (r."updated_at" AT TIME ZONE 'UTC' AT TIME ZONE z."time_zone")::date,
       r."updated_at"
FROM "routines" r JOIN owner_zones z ON z."id" = r."owner_id"
WHERE r."is_active" = false;
