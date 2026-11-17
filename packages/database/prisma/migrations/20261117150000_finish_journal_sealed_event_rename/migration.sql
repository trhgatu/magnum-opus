-- Nhịp 3/3 đổi tên event Journal. Lặp lại câu UPDATE của 20261117090000 cho
-- các row mà instance cũ đã ghi bằng tên sai trong lúc deploy nhịp 2.
UPDATE "outbox_events"
SET "type" = 'reflection.journal-entry.sealed.v1'
WHERE "type" = 'relection.journal-entry.sealed.v1';
