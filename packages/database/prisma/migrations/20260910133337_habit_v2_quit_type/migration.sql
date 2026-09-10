-- CreateEnum
CREATE TYPE "HabitType" AS ENUM ('BUILD', 'QUIT');

-- AlterTable
ALTER TABLE "habits" ADD COLUMN     "quit_started_at" DATE,
ADD COLUMN     "type" "HabitType" NOT NULL DEFAULT 'BUILD',
ALTER COLUMN "frequency_type" DROP NOT NULL;

-- CreateTable
CREATE TABLE "habit_relapses" (
    "id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_relapses_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "habit_relapses_habit_id_occurred_at_idx" ON "habit_relapses"("habit_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "habits_owner_id_type_idx" ON "habits"("owner_id", "type");

-- AddForeignKey
ALTER TABLE "habit_relapses" ADD CONSTRAINT "habit_relapses_habit_id_owner_id_fkey" FOREIGN KEY ("habit_id", "owner_id") REFERENCES "habits"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;
