-- V1.1 Cycle Flexibility — bản EXPAND: chỉ thêm. Cột intended_outcome được
-- giữ lại vì CI migrate production trước khi Render chuyển sang server mới;
-- server cũ còn chạy vài phút vẫn đọc nó. Drop ở migration riêng sau này.

-- AlterTable
ALTER TABLE "project_cycles" ADD COLUMN "closing_note" VARCHAR(2000),
ADD COLUMN "target_end_at" DATE;

-- CreateTable
CREATE TABLE "project_cycle_outcome_entries" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "sequence" INTEGER NOT NULL,
    "outcome" TEXT NOT NULL,
    "set_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_cycle_outcome_entries_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "project_cycle_outcome_entries_cycle_id_sequence_key" ON "project_cycle_outcome_entries"("cycle_id", "sequence");

-- AddForeignKey
ALTER TABLE "project_cycle_outcome_entries" ADD CONSTRAINT "project_cycle_outcome_entries_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "project_cycles"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Backfill (08-database-schema.md §14.4): mỗi Cycle V1 có tối đa 1 outcome →
-- đúng 1 entry sequence = 1. set_at = updated_at là xấp xỉ: V1 không lưu thời
-- điểm đặt outcome, và các giá trị bị ghi đè trước đó đã mất từ V1.
INSERT INTO "project_cycle_outcome_entries"
  ("id", "cycle_id", "sequence", "outcome", "set_at")
SELECT gen_random_uuid()::text, "id", 1, "intended_outcome", "updated_at"
FROM "project_cycles"
WHERE "intended_outcome" IS NOT NULL;
