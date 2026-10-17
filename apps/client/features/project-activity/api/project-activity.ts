import "server-only";

import type { ActivitySourceResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

/** Nguồn của Project như sổ đang có — không chép (07 §5.1). */
export function getActivitySources(
  projectId: string,
): Promise<ActivitySourceResponse[]> {
  return apiFetch<ActivitySourceResponse[]>(
    `/projects/${projectId}/activity/sources`,
  );
}
