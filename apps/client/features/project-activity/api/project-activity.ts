import "server-only";

import type {
  ActivitySourceResponse,
  CycleActivitySnapshotResponse,
  ProjectActivityResponse,
} from "@repo/contracts";

import { apiFetch } from "@/lib/api";

/** Nguồn của Project như sổ đang có — không chép (07 §5.1). */
export function getActivitySources(
  projectId: string,
): Promise<ActivitySourceResponse[]> {
  return apiFetch<ActivitySourceResponse[]>(
    `/projects/${projectId}/activity/sources`,
  );
}

/**
 * Hoạt động của vòng đang mở và các chỗ lệch. Server có thể đồng bộ tới
 * 10 giây trước khi trả lời (07 §5.4) — đọc trong Suspense riêng.
 */
export function getProjectActivity(
  projectId: string,
): Promise<ProjectActivityResponse> {
  return apiFetch<ProjectActivityResponse>(`/projects/${projectId}/activity`);
}

/** Snapshot của các vòng đã đóng, đúng như lúc chụp (07 §5.5). */
export function getCycleSnapshots(
  projectId: string,
): Promise<CycleActivitySnapshotResponse[]> {
  return apiFetch<CycleActivitySnapshotResponse[]>(
    `/projects/${projectId}/activity/snapshots`,
  );
}
