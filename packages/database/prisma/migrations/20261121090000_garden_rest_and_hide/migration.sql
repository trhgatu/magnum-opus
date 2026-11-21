-- AlterEnum
ALTER TYPE "GardenEntryKind" ADD VALUE 'RESTED';
ALTER TYPE "GardenEntryKind" ADD VALUE 'RESUMED';

-- AlterTable
ALTER TABLE "garden_subjects" ADD COLUMN "hidden_at" TIMESTAMP(3);
