-- AlterEnum
ALTER TYPE "GardenEntryKind" ADD VALUE 'MARKED';

-- CreateEnum
CREATE TYPE "GardenMark" AS ENUM ('SCAR');

-- AlterTable
ALTER TABLE "garden_entries" ADD COLUMN "mark" "GardenMark";
