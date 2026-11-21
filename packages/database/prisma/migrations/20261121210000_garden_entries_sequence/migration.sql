-- Thứ tự ghi của sổ: recorded_at có thể trùng (cùng mili giây, hoặc mọi dòng
-- của một transaction như lần nạp lịch sử), nên "dòng ghi sau thắng" cần một
-- số tăng dần.
ALTER TABLE "garden_entries" ADD COLUMN "sequence" BIGSERIAL NOT NULL;

-- BIGSERIAL đánh số dòng cũ theo thứ tự quét bảng: đánh lại theo recorded_at.
-- Số mới nằm trong 1..số dòng, mà sequence đã chạy tới ít nhất số đó, nên dòng
-- ghi sau vẫn nhận số lớn hơn.
UPDATE "garden_entries" AS e
SET "sequence" = r.rn
FROM (
  SELECT id, row_number() OVER (ORDER BY recorded_at, id) AS rn
  FROM "garden_entries"
) AS r
WHERE e.id = r.id;
