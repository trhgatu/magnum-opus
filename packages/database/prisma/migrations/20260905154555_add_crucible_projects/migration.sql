-- CreateEnum
CREATE TYPE "ProjectLifecycleState" AS ENUM ('NOT_STARTED', 'ACTIVE', 'PAUSED', 'STOPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProjectCycleEndReason" AS ENUM ('STOPPED', 'COMPLETED');

-- CreateEnum
CREATE TYPE "ProjectLifecycleAction" AS ENUM ('START', 'PAUSE', 'RESUME', 'STOP', 'COMPLETE', 'REOPEN');

-- CreateTable
CREATE TABLE "projects" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "title" VARCHAR(200) NOT NULL,
    "description" TEXT,
    "lifecycle_state" "ProjectLifecycleState" NOT NULL DEFAULT 'NOT_STARTED',
    "revision" INTEGER NOT NULL DEFAULT 1,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "projects_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_cycles" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "cycle_number" INTEGER NOT NULL,
    "intended_outcome" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL,
    "ended_at" TIMESTAMP(3),
    "end_reason" "ProjectCycleEndReason",
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "project_cycles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_lifecycle_transitions" (
    "id" TEXT NOT NULL,
    "project_id" TEXT NOT NULL,
    "cycle_id" TEXT,
    "action" "ProjectLifecycleAction" NOT NULL,
    "from_state" "ProjectLifecycleState" NOT NULL,
    "to_state" "ProjectLifecycleState" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_lifecycle_transitions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "projects_owner_id_lifecycle_state_idx" ON "projects"("owner_id", "lifecycle_state");

-- CreateIndex
CREATE INDEX "projects_owner_id_created_at_idx" ON "projects"("owner_id", "created_at" DESC);

-- CreateIndex
CREATE UNIQUE INDEX "projects_id_owner_id_key" ON "projects"("id", "owner_id");

-- CreateIndex
CREATE INDEX "project_cycles_project_id_ended_at_idx" ON "project_cycles"("project_id", "ended_at");

-- CreateIndex
CREATE UNIQUE INDEX "project_cycles_project_id_cycle_number_key" ON "project_cycles"("project_id", "cycle_number");

-- CreateIndex
CREATE INDEX "project_lifecycle_transitions_project_id_occurred_at_idx" ON "project_lifecycle_transitions"("project_id", "occurred_at" DESC);

-- CreateIndex
CREATE INDEX "project_lifecycle_transitions_cycle_id_idx" ON "project_lifecycle_transitions"("cycle_id");

-- AddForeignKey
ALTER TABLE "projects" ADD CONSTRAINT "projects_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_cycles" ADD CONSTRAINT "project_cycles_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lifecycle_transitions" ADD CONSTRAINT "project_lifecycle_transitions_project_id_fkey" FOREIGN KEY ("project_id") REFERENCES "projects"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_lifecycle_transitions" ADD CONSTRAINT "project_lifecycle_transitions_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "project_cycles"("id") ON DELETE SET NULL ON UPDATE CASCADE;
