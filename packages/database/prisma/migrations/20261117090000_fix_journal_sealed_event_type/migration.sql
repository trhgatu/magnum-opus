-- Nhịp 2/3 đổi tên event Journal: sửa lỗi chính tả "relection" trong outbox.
-- Instance cũ còn chạy lúc deploy có thể ghi thêm row tên sai sau câu này.
-- Nhịp 3 phải có thư mục migration MỚI lặp lại đúng câu UPDATE dưới đây:
-- Prisma không chạy lại migration đã ghi trong _prisma_migrations.
UPDATE "outbox_events"
SET "type" = 'reflection.journal-entry.sealed.v1'
WHERE "type" = 'relection.journal-entry.sealed.v1';
