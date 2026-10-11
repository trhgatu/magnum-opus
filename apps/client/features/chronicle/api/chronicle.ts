import "server-only";

import type { ChronicleResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

export function getChronicle(
  year: number,
  month: number,
): Promise<ChronicleResponse> {
  return apiFetch<ChronicleResponse>(`/chronicle/${year}/${month}`);
}
