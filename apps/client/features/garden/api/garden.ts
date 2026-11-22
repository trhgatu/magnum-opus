import "server-only";

import type { GardenResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

export function getGarden(): Promise<GardenResponse> {
  return apiFetch<GardenResponse>("/garden");
}
