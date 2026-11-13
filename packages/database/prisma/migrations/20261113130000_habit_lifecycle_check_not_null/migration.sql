-- state_before_trash IN (...) cho ra NULL khi cột NULL, và CHECK coi NULL
-- là đạt: ghi rõ IS NOT NULL để Habit TRASHED luôn có chỗ quay về.
ALTER TABLE "habits" DROP CONSTRAINT "habits_lifecycle_check";

ALTER TABLE "habits"
ADD CONSTRAINT "habits_lifecycle_check"
CHECK (
  (
    "state" = 'TRASHED'
    AND "state_before_trash" IS NOT NULL
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
