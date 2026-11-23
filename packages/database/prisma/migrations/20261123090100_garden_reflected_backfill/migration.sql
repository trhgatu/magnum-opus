-- Chỉ dòng REFLECTED không thuộc cây nào.
ALTER TABLE "garden_entries"
  ADD CONSTRAINT "garden_entries_subject_matches_kind"
  CHECK (("kind" = 'REFLECTED') = ("subject_id" IS NULL));

-- Nạp các lần niêm phong có từ trước, từ dòng thời gian của Reflection,
-- vào ngày theo múi giờ tài khoản (múi giờ lạ thì dùng UTC).
WITH "owner_zones" AS (
  SELECT u."id", COALESCE(tz."name", 'UTC') AS "time_zone"
  FROM "users" u LEFT JOIN pg_timezone_names tz ON tz."name" = u."time_zone"
)
INSERT INTO "garden_entries"
  ("id", "owner_id", "subject_id", "kind", "occurred_on", "source_event_id", "source_ref")
SELECT gen_random_uuid()::text, t."owner_id", NULL, 'REFLECTED',
       (t."occurred_on" AT TIME ZONE 'UTC' AT TIME ZONE z."time_zone")::date,
       'backfill:journal-entry-sealed:' || t."source_id", t."source_id"
FROM "reflection_timeline_entries" t
JOIN "owner_zones" z ON z."id" = t."owner_id"
WHERE t."entry_type" = 'JOURNAL_SEALED'
  AND NOT EXISTS (
    SELECT 1 FROM "garden_entries" e
    WHERE e."kind" = 'REFLECTED' AND e."source_ref" = t."source_id"
  )
ON CONFLICT ("source_event_id") DO NOTHING;