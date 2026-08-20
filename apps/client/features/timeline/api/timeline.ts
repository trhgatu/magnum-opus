import "server-only";

import type { TimelineEntryResponse } from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";

import { apiFetch } from "@/lib/api";

export interface TimelineListInput {
  page?: number;
  limit?: number;
}

export function getTimelineEntries(
  input: TimelineListInput = {},
): Promise<PaginatedResult<TimelineEntryResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  return apiFetch<PaginatedResult<TimelineEntryResponse>>(
    `/reflection/timeline?${params.toString()}`,
  );
}
