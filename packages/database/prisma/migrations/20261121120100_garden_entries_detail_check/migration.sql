-- Lịch chỉ đi với dòng RHYTHM_SET, và dòng RHYTHM_SET luôn có lịch.
ALTER TABLE "garden_entries"
  ADD CONSTRAINT "garden_entries_detail_matches_kind"
  CHECK (("kind" = 'RHYTHM_SET') = ("detail" IS NOT NULL));
