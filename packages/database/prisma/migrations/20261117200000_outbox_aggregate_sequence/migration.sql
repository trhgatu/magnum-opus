-- Thứ tự ghi của event. Publisher dùng nó để xử lý event của cùng một
-- aggregate đúng thứ tự. Postgres tự đánh số cho các row đã có.
ALTER TABLE "outbox_events" ADD COLUMN "sequence" BIGSERIAL NOT NULL;

CREATE INDEX "outbox_events_aggregate_id_sequence_idx"
  ON "outbox_events"("aggregate_id", "sequence");
