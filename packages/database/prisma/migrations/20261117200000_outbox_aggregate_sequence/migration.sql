-- Thứ tự ghi của event. Publisher dùng nó để xử lý event của cùng một
-- aggregate đúng thứ tự.
ALTER TABLE "outbox_events" ADD COLUMN "sequence" BIGSERIAL NOT NULL;

-- BIGSERIAL đánh số row cũ theo thứ tự quét bảng, không theo thời gian ghi:
-- đánh lại theo created_at. Số mới nằm trong 1..số row, mà sequence đã chạy
-- tới ít nhất số đó, nên row ghi sau vẫn nhận số lớn hơn.
UPDATE "outbox_events" AS o
SET "sequence" = r.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn
  FROM "outbox_events"
) AS r
WHERE o.id = r.id;

CREATE INDEX "outbox_events_aggregate_id_sequence_idx"
  ON "outbox_events"("aggregate_id", "sequence");
