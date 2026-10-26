-- Thời gian code của Cycle lúc khép (BA 08 §9.2). Thêm cột cho phép null:
-- snapshot đã chụp giữ nguyên là null, server cũ vẫn ghi được trong lúc deploy.
ALTER TABLE "cycle_activity_snapshots" ADD COLUMN "coding_seconds" INTEGER;

ALTER TABLE "cycle_activity_snapshots"
  ADD CONSTRAINT "cycle_activity_snapshots_coding_seconds_check"
  CHECK ("coding_seconds" >= 0);
