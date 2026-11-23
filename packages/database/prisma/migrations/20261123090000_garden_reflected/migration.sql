-- AlterEnum
ALTER TYPE "GardenEntryKind" ADD VALUE 'REFLECTED';

-- Dòng nhìn lại thuộc cả vườn, không thuộc cây nào (BA §6.2).
ALTER TABLE "garden_entries" ALTER COLUMN "subject_id" DROP NOT NULL;
-- Định danh nguồn (vd id trang nhật ký), để dọn khi nguồn bị xóa vĩnh viễn.
ALTER TABLE "garden_entries" ADD COLUMN "source_ref" TEXT;