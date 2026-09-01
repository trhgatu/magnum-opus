import "server-only";

import type { ForgeTodayResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

export function getToday(): Promise<ForgeTodayResponse> {
  return apiFetch<ForgeTodayResponse>("/forge/today");
}
