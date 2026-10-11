-- CreateEnum
CREATE TYPE "ChroniclePeriodType" AS ENUM ('DAY', 'MONTH', 'QUARTER', 'YEAR');

-- CreateTable
CREATE TABLE "chronicle_snapshots" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "period_type" "ChroniclePeriodType" NOT NULL,
    "period_key" TEXT NOT NULL,
    "period_start" TIMESTAMP(3) NOT NULL,
    "period_end" TIMESTAMP(3) NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "chronicle_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "chronicle_snapshot_sections" (
    "id" TEXT NOT NULL,
    "snapshot_id" TEXT NOT NULL,
    "module" TEXT NOT NULL,
    "schema_version" INTEGER NOT NULL,
    "computed_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "data" JSONB NOT NULL,

    CONSTRAINT "chronicle_snapshot_sections_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "chronicle_snapshots_owner_id_period_type_period_key_key" ON "chronicle_snapshots"("owner_id", "period_type", "period_key");

-- CreateIndex
CREATE UNIQUE INDEX "chronicle_snapshot_sections_snapshot_id_module_key" ON "chronicle_snapshot_sections"("snapshot_id", "module");

-- AddForeignKey
ALTER TABLE "chronicle_snapshots" ADD CONSTRAINT "chronicle_snapshots_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "chronicle_snapshot_sections" ADD CONSTRAINT "chronicle_snapshot_sections_snapshot_id_fkey" FOREIGN KEY ("snapshot_id") REFERENCES "chronicle_snapshots"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Ranh giới kỳ đã đóng băng là cơ sở để đọc lại snapshot — chặn dòng sai ngay
-- ở database (Prisma không biểu diễn được CHECK).
ALTER TABLE "chronicle_snapshots"
  ADD CONSTRAINT "chronicle_snapshots_valid_period"
  CHECK ("period_end" > "period_start");
