-- Project Activity Evidence — Phase 1 (GitHub). BA:
-- product/ba/contexts/crucible/project-activity/03-integration-architecture.md §7.
-- Chỉ thêm (5 enum, 5 bảng): không sửa bảng hiện có, nên an toàn với việc CI
-- migrate production trước khi Render chuyển sang server mới.

-- CreateEnum
CREATE TYPE "IntegrationProvider" AS ENUM ('GITHUB');

-- CreateEnum
CREATE TYPE "IntegrationConnectionStatus" AS ENUM ('ACTIVE', 'EXPIRED', 'REVOKED');

-- CreateEnum
CREATE TYPE "ActivityProvider" AS ENUM ('GITHUB');

-- CreateEnum
CREATE TYPE "ActivityFeedStatus" AS ENUM ('ACTIVE', 'ERROR', 'DISCONNECTED');

-- CreateEnum
CREATE TYPE "ActivityKind" AS ENUM ('COMMIT_AUTHORED', 'PR_OPENED', 'PR_MERGED');

-- CreateTable
CREATE TABLE "integration_connections" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "provider" "IntegrationProvider" NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "external_account_node_id" TEXT,
    "display_name" VARCHAR(255) NOT NULL,
    "credentials" TEXT NOT NULL,
    "status" "IntegrationConnectionStatus" NOT NULL DEFAULT 'ACTIVE',
    "expires_at" TIMESTAMP(3),
    "last_verified_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "integration_connections_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_feeds" (
    "id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "provider" "ActivityProvider" NOT NULL,
    "external_account_id" TEXT NOT NULL,
    "external_resource_id" TEXT NOT NULL,
    "display_name" VARCHAR(255) NOT NULL,
    "covered_from" TIMESTAMP(3),
    "synced_until" TIMESTAMP(3),
    "last_sync_at" TIMESTAMP(3),
    "status" "ActivityFeedStatus" NOT NULL DEFAULT 'ACTIVE',
    "last_error_code" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "activity_feeds_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "activity_events" (
    "id" TEXT NOT NULL,
    "feed_id" TEXT NOT NULL,
    "kind" "ActivityKind" NOT NULL,
    "occurred_at" TIMESTAMP(3) NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "dedupe_key" VARCHAR(128) NOT NULL,
    "ingested_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "activity_events_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "project_activity_sources" (
    "project_id" TEXT NOT NULL,
    "feed_id" TEXT NOT NULL,
    "owner_id" TEXT NOT NULL,
    "linked_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "project_activity_sources_pkey" PRIMARY KEY ("project_id","feed_id")
);

-- CreateTable
CREATE TABLE "cycle_activity_snapshots" (
    "id" TEXT NOT NULL,
    "cycle_id" TEXT NOT NULL,
    "active_days" INTEGER NOT NULL,
    "paused_active_days" INTEGER NOT NULL,
    "commits" INTEGER NOT NULL,
    "prs_opened" INTEGER NOT NULL,
    "prs_merged" INTEGER NOT NULL,
    "last_activity_at" TIMESTAMP(3),
    "days" JSONB NOT NULL,
    "sources" JSONB NOT NULL,
    "time_zone" VARCHAR(64) NOT NULL,
    "data_until" TIMESTAMP(3),
    "captured_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "cycle_activity_snapshots_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "integration_connections_owner_id_provider_key" ON "integration_connections"("owner_id", "provider");

-- CreateIndex
CREATE UNIQUE INDEX "activity_feeds_id_owner_id_key" ON "activity_feeds"("id", "owner_id");

-- CreateIndex
CREATE UNIQUE INDEX "activity_feeds_owner_id_provider_external_account_id_extern_key" ON "activity_feeds"("owner_id", "provider", "external_account_id", "external_resource_id");

-- CreateIndex
CREATE INDEX "activity_events_feed_id_occurred_at_idx" ON "activity_events"("feed_id", "occurred_at");

-- CreateIndex
CREATE UNIQUE INDEX "activity_events_feed_id_kind_dedupe_key_key" ON "activity_events"("feed_id", "kind", "dedupe_key");

-- CreateIndex
CREATE INDEX "project_activity_sources_feed_id_idx" ON "project_activity_sources"("feed_id");

-- CreateIndex
CREATE UNIQUE INDEX "cycle_activity_snapshots_cycle_id_key" ON "cycle_activity_snapshots"("cycle_id");

-- AddForeignKey
ALTER TABLE "integration_connections" ADD CONSTRAINT "integration_connections_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_feeds" ADD CONSTRAINT "activity_feeds_owner_id_fkey" FOREIGN KEY ("owner_id") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "activity_events" ADD CONSTRAINT "activity_events_feed_id_fkey" FOREIGN KEY ("feed_id") REFERENCES "activity_feeds"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activity_sources" ADD CONSTRAINT "project_activity_sources_project_id_owner_id_fkey" FOREIGN KEY ("project_id", "owner_id") REFERENCES "projects"("id", "owner_id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "project_activity_sources" ADD CONSTRAINT "project_activity_sources_feed_id_owner_id_fkey" FOREIGN KEY ("feed_id", "owner_id") REFERENCES "activity_feeds"("id", "owner_id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "cycle_activity_snapshots" ADD CONSTRAINT "cycle_activity_snapshots_cycle_id_fkey" FOREIGN KEY ("cycle_id") REFERENCES "project_cycles"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddCheckConstraints — Prisma không biểu diễn được CHECK; ghi chú ở schema.prisma.
ALTER TABLE "activity_events"
ADD CONSTRAINT "activity_events_quantity_check"
CHECK ("quantity" > 0);

ALTER TABLE "cycle_activity_snapshots"
ADD CONSTRAINT "cycle_activity_snapshots_counts_check"
CHECK (
  "active_days" >= 0
  AND "paused_active_days" >= 0
  AND "paused_active_days" <= "active_days"
  AND "commits" >= 0
  AND "prs_opened" >= 0
  AND "prs_merged" >= 0
);
