-- V1.1 PR4c — bản CONTRACT: drop cột cũ. Outcome nằm ở
-- project_cycle_outcome_entries từ 20261012120000_project_cycle_flexibility;
-- server từ PR4a không đọc, từ PR4b không ghi cột này, nên bản còn sống
-- trong lúc migrate (CI migrate trước khi Render chuyển server) không lỗi.

-- AlterTable
ALTER TABLE "project_cycles" DROP COLUMN "intended_outcome";
