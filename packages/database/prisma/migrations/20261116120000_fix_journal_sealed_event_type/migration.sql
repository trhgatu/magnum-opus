-- Sửa lỗi chính tả "relection" trong tên event Journal đã lưu ở outbox.
UPDATE "outbox_events"
SET "type" = 'reflection.journal-entry.sealed.v1'
WHERE "type" = 'relection.journal-entry.sealed.v1';
