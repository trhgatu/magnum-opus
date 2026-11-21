-- Nạp lịch sử Garden từ Forge (BR-GDN-SB-005). Mỗi nguồn chỉ ghi phần sổ còn
-- thiếu, nên Habit đã có dòng ghi lúc chạy thật không bị ghi trùng, và chạy
-- lại không ra thêm dòng nào.

-- 1. Gieo cây cho Habit chưa có (BR-GDN-001): BUILD từ created_on, QUIT từ
--    quit_started_at. Habit đang ở Thùng rác thì cây ẩn ngay.
INSERT INTO "garden_subjects"
  ("id", "owner_id", "subject_kind", "subject_id", "variant",
   "name_at_planting", "sim_version", "planted_on", "hidden_at")
SELECT gen_random_uuid()::text, h."owner_id", 'HABIT', h."id",
       h."type"::text::"GardenVariant", h."title", 1,
       COALESCE(h."quit_started_at", h."created_on"),
       CASE WHEN h."state" = 'TRASHED' THEN h."trashed_at" END
FROM "habits" h
ON CONFLICT ("subject_kind", "subject_id") DO NOTHING;

-- 2. QUIT gieo lại theo ngày bắt đầu bỏ hiện tại (BR-GDN-007).
UPDATE "garden_subjects" s
SET "planted_on" = h."quit_started_at"
FROM "habits" h
WHERE s."subject_kind" = 'HABIT' AND s."subject_id" = h."id"
  AND h."type" = 'QUIT' AND s."planted_on" <> h."quit_started_at";

-- 3. Cây ẩn đúng khi Habit đang ở Thùng rác (BR-GDN-SB-007).
UPDATE "garden_subjects" s
SET "hidden_at" = CASE WHEN h."state" = 'TRASHED' THEN h."trashed_at" END
FROM "habits" h
WHERE s."subject_kind" = 'HABIT' AND s."subject_id" = h."id"
  AND (h."state" = 'TRASHED') <> (s."hidden_at" IS NOT NULL);

-- 4. Check-in còn giữ thành TENDED, trừ ngày sổ đã có một lần chăm còn hiệu lực.
INSERT INTO "garden_entries"
  ("id", "owner_id", "subject_id", "kind", "occurred_on", "source_event_id")
SELECT gen_random_uuid()::text, s."owner_id", s."id", 'TENDED', c."date",
       'backfill:habit-check-in:' || c."id"
FROM "habit_check_ins" c
JOIN "garden_subjects" s
  ON s."subject_kind" = 'HABIT' AND s."subject_id" = c."habit_id"
WHERE (
  SELECT count(*) FILTER (WHERE e."kind" = 'TENDED')
       - count(*) FILTER (WHERE e."kind" = 'UNTENDED')
  FROM "garden_entries" e
  WHERE e."subject_id" = s."id" AND e."occurred_on" = c."date"
) < 1
ON CONFLICT ("source_event_id") DO NOTHING;

-- 5. Tái phạm thành SCAR, vào ngày theo múi giờ hiện tại của tài khoản.
--    Ngày đó sổ đã có n sẹo thì bỏ qua n lần tái phạm đầu. Múi giờ PostgreSQL
--    không nhận ra (giá trị cũ/sai) thì dùng UTC, để một tài khoản không chặn
--    cả migration.
WITH "owner_zones" AS (
  SELECT u."id", COALESCE(tz."name", 'UTC') AS "time_zone"
  FROM "users" u LEFT JOIN pg_timezone_names tz ON tz."name" = u."time_zone"
), "relapse_days" AS (
  SELECT r."id", s."id" AS "subject_id", s."owner_id",
         (r."occurred_at" AT TIME ZONE 'UTC' AT TIME ZONE z."time_zone")::date AS "day"
  FROM "habit_relapses" r
  JOIN "garden_subjects" s
    ON s."subject_kind" = 'HABIT' AND s."subject_id" = r."habit_id"
  JOIN "owner_zones" z ON z."id" = r."owner_id"
), "numbered" AS (
  SELECT d.*, row_number() OVER (
    PARTITION BY d."subject_id", d."day" ORDER BY d."id"
  ) AS "n"
  FROM "relapse_days" d
)
INSERT INTO "garden_entries"
  ("id", "owner_id", "subject_id", "kind", "mark", "occurred_on", "source_event_id")
SELECT gen_random_uuid()::text, n."owner_id", n."subject_id", 'MARKED', 'SCAR',
       n."day", 'backfill:habit-relapse:' || n."id"
FROM "numbered" n
WHERE n."n" > (
  SELECT count(*) FROM "garden_entries" e
  WHERE e."subject_id" = n."subject_id" AND e."kind" = 'MARKED'
    AND e."occurred_on" = n."day"
)
ON CONFLICT ("source_event_id") DO NOTHING;

-- 6. Lưu trữ / khôi phục thành RESTED / RESUMED (BR-GDN-005), cùng cách đếm.
WITH "transitions" AS (
  SELECT t."id", s."id" AS "subject_id", s."owner_id", t."effective_on" AS "day",
         (CASE t."action" WHEN 'ARCHIVED' THEN 'RESTED' ELSE 'RESUMED' END)::"GardenEntryKind" AS "kind"
  FROM "habit_lifecycle_transitions" t
  JOIN "garden_subjects" s
    ON s."subject_kind" = 'HABIT' AND s."subject_id" = t."habit_id"
), "numbered" AS (
  SELECT t.*, row_number() OVER (
    PARTITION BY t."subject_id", t."kind", t."day" ORDER BY t."id"
  ) AS "n"
  FROM "transitions" t
)
INSERT INTO "garden_entries"
  ("id", "owner_id", "subject_id", "kind", "occurred_on", "source_event_id")
SELECT gen_random_uuid()::text, n."owner_id", n."subject_id", n."kind", n."day",
       'backfill:habit-lifecycle-transition:' || n."id"
FROM "numbered" n
WHERE n."n" > (
  SELECT count(*) FROM "garden_entries" e
  WHERE e."subject_id" = n."subject_id" AND e."kind" = n."kind"
    AND e."occurred_on" = n."day"
)
ON CONFLICT ("source_event_id") DO NOTHING;

-- 7. Phiên bản lịch thành RHYTHM_SET (BR-GDN-002), cùng cách đếm theo lịch.
WITH "rhythms" AS (
  SELECT v."id", s."id" AS "subject_id", s."owner_id", v."effective_from" AS "day",
         jsonb_build_object(
           'type', v."frequency_type"::text,
           'days', to_jsonb(v."frequency_days")
         ) AS "detail"
  FROM "habit_schedule_versions" v
  JOIN "garden_subjects" s
    ON s."subject_kind" = 'HABIT' AND s."subject_id" = v."habit_id"
), "numbered" AS (
  SELECT r.*, row_number() OVER (
    PARTITION BY r."subject_id", r."day", r."detail" ORDER BY r."id"
  ) AS "n"
  FROM "rhythms" r
)
INSERT INTO "garden_entries"
  ("id", "owner_id", "subject_id", "kind", "detail", "occurred_on", "source_event_id")
SELECT gen_random_uuid()::text, n."owner_id", n."subject_id", 'RHYTHM_SET', n."detail",
       n."day", 'backfill:habit-schedule-version:' || n."id"
FROM "numbered" n
WHERE n."n" > (
  SELECT count(*) FROM "garden_entries" e
  WHERE e."subject_id" = n."subject_id" AND e."kind" = 'RHYTHM_SET'
    AND e."occurred_on" = n."day" AND e."detail" = n."detail"
)
ON CONFLICT ("source_event_id") DO NOTHING;
