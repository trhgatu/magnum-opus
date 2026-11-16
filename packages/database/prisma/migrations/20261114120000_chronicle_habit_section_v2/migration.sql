-- Section habit v1 chỉ lưu tên. Gắn habitId khi tên khớp ĐÚNG 1 habit còn
-- tồn tại của owner cùng loại (tính cả lưu trữ và Thùng rác). Trùng tên thì
-- habitId = null: không đoán. Habit đã xóa trước migration không còn row nào
-- để thấy: mục của nó giữ null, hoặc bị gắn vào habit còn sống trùng tên duy
-- nhất (giới hạn đã ghi ở Habit V4 BA §8).
-- Sau đó section lên v2, để khi xóa habit Chronicle quên được tên.
CREATE FUNCTION pg_temp.with_habit_id(p_owner_id TEXT, p_type TEXT, p_item JSONB)
RETURNS JSONB
LANGUAGE SQL
STABLE
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_item) IS DISTINCT FROM 'object' THEN p_item
    ELSE p_item || jsonb_build_object('habitId', (
      SELECT CASE WHEN count(*) = 1 THEN min(h.id) END
      FROM "habits" AS h
      WHERE h."owner_id" = p_owner_id
        AND h."type"::TEXT = p_type
        AND h."title" = p_item ->> 'habitTitle'
    ))
  END
$$;

UPDATE "chronicle_snapshot_sections" AS s
SET
  "schema_version" = 2,
  "data" = s."data" || jsonb_build_object(
    'bestStreak',
    pg_temp.with_habit_id(c."owner_id", 'BUILD', s."data" -> 'bestStreak'),
    'mostConsistentHabit',
    pg_temp.with_habit_id(c."owner_id", 'BUILD', s."data" -> 'mostConsistentHabit'),
    'quitHabits',
    COALESCE(
      (
        SELECT jsonb_agg(
          pg_temp.with_habit_id(c."owner_id", 'QUIT', q.item)
          ORDER BY q.position
        )
        FROM jsonb_array_elements(s."data" -> 'quitHabits')
          WITH ORDINALITY AS q(item, position)
      ),
      '[]'::JSONB
    )
  )
FROM "chronicle_snapshots" AS c
WHERE c."id" = s."snapshot_id"
  AND s."module" = 'habit'
  AND s."schema_version" = 1;
