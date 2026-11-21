-- AlterEnum
ALTER TYPE "GardenEntryKind" ADD VALUE 'RHYTHM_SET';

-- AlterTable
ALTER TABLE "garden_entries" ADD COLUMN "detail" JSONB;
