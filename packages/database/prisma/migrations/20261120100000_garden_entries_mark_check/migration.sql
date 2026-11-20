-- Dấu chỉ đi với dòng MARKED, và dòng MARKED luôn có dấu.
-- Tách khỏi migration thêm 'MARKED': Postgres không cho dùng giá trị enum mới trong cùng transaction.
ALTER TABLE "garden_entries"
  ADD CONSTRAINT "garden_entries_mark_matches_kind"
  CHECK (("kind" = 'MARKED') = ("mark" IS NOT NULL));
