-- CreateEnum
CREATE TYPE "GardenDatePrecision" AS ENUM ('DAY', 'MONTH', 'YEAR', 'UNKNOWN');

-- CreateTable
CREATE TABLE "garden_lanterns" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "memory_id" TEXT NOT NULL,
    "occurred_on" DATE,
    "precision" "GardenDatePrecision" NOT NULL,
    "hidden_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "garden_lanterns_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "garden_lanterns_memory_id_key" ON "garden_lanterns"("memory_id");

-- CreateIndex
CREATE INDEX "garden_lanterns_owner_id_idx" ON "garden_lanterns"("owner_id");

-- AddForeignKey
ALTER TABLE "garden_lanterns" ADD CONSTRAINT "garden_lanterns_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Không rõ ngày thì không có ngày, và ngược lại.
ALTER TABLE "garden_lanterns"
  ADD CONSTRAINT "garden_lanterns_date_matches_precision"
  CHECK (("precision" = 'UNKNOWN') = ("occurred_on" IS NULL));

-- Treo đèn cho các ký ức có từ trước; ký ức đang ở Thùng rác thì đèn ẩn.
INSERT INTO "garden_lanterns"
  ("id", "owner_id", "memory_id", "occurred_on", "precision", "hidden_at")
SELECT gen_random_uuid()::text, m."owner_id", m."id",
       CASE WHEN m."occurred_on_precision" = 'UNKNOWN' THEN NULL ELSE m."occurred_on" END,
       m."occurred_on_precision"::text::"GardenDatePrecision",
       CASE WHEN m."state" = 'TRASHED' THEN COALESCE(m."trashed_at", m."updated_at") END
FROM "memories" m
ON CONFLICT ("memory_id") DO NOTHING;