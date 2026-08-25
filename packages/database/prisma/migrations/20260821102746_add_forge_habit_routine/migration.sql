-- CreateEnum
CREATE TYPE "HabitFrequencyType" AS ENUM ('DAILY', 'WEEKLY');

-- CreateTable
CREATE TABLE "habits" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "frequency_type" "HabitFrequencyType" NOT NULL,
    "frequency_days" INTEGER[] NOT NULL DEFAULT ARRAY[]::INTEGER[],
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "habits_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "habit_check_ins" (
    "id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "date" DATE NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "habit_check_ins_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routines" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "routines_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "routine_habits" (
    "routine_id" TEXT NOT NULL,
    "habit_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "order" INTEGER NOT NULL,

    CONSTRAINT "routine_habits_pkey" PRIMARY KEY ("routine_id","habit_id")
);

-- CreateIndex
CREATE INDEX "habits_owner_id_is_active_idx" ON "habits"("owner_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "habits_id_owner_id_key" ON "habits"("id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "habit_check_ins_habit_id_date_key" ON "habit_check_ins"("habit_id", "date");

-- CreateIndex
CREATE INDEX "habit_check_ins_owner_id_date_idx" ON "habit_check_ins"("owner_id", "date");

-- CreateIndex
CREATE INDEX "routines_owner_id_is_active_idx" ON "routines"("owner_id", "is_active");

-- CreateIndex
CREATE UNIQUE INDEX "routines_id_owner_id_key" ON "routines"("id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "routine_habits_routine_id_order_key" ON "routine_habits"("routine_id", "order");

-- AddForeignKey
ALTER TABLE "habits" ADD CONSTRAINT "habits_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "habit_check_ins" ADD CONSTRAINT "habit_check_ins_habit_id_owner_id_fkey" FOREIGN KEY ("habit_id", "owner_id") REFERENCES "habits"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routines" ADD CONSTRAINT "routines_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_habits" ADD CONSTRAINT "routine_habits_routine_id_owner_id_fkey" FOREIGN KEY ("routine_id", "owner_id") REFERENCES "routines"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "routine_habits" ADD CONSTRAINT "routine_habits_habit_id_owner_id_fkey" FOREIGN KEY ("habit_id", "owner_id") REFERENCES "habits"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraint
ALTER TABLE "habits"
ADD CONSTRAINT "habits_title_check"
CHECK (char_length(btrim("title")) BETWEEN 1 AND 200);

-- AddCheckConstraint
ALTER TABLE "habits"
ADD CONSTRAINT "habits_revision_check"
CHECK ("revision" >= 1);

-- AddCheckConstraint
ALTER TABLE "habits"
ADD CONSTRAINT "habits_frequency_days_range_check"
CHECK ("frequency_days" <@ ARRAY[1, 2, 3, 4, 5, 6, 7]::INTEGER[]);

-- AddCheckConstraint
ALTER TABLE "habits"
ADD CONSTRAINT "habits_frequency_shape_check"
CHECK (
  ("frequency_type" = 'DAILY' AND cardinality("frequency_days") = 0)
  OR
  ("frequency_type" = 'WEEKLY' AND cardinality("frequency_days") >= 1)
);

-- AddCheckConstraint
ALTER TABLE "routines"
ADD CONSTRAINT "routines_title_check"
CHECK (char_length(btrim("title")) BETWEEN 1 AND 200);

-- AddCheckConstraint
ALTER TABLE "routines"
ADD CONSTRAINT "routines_revision_check"
CHECK ("revision" >= 1);

-- AddCheckConstraint
ALTER TABLE "routine_habits"
ADD CONSTRAINT "routine_habits_order_check"
CHECK ("order" >= 1);
