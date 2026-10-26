import "server-only";

import type { WakaTimeConnectionResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

export async function getWakaTimeConnection(): Promise<WakaTimeConnectionResponse | null> {
  const connection = await apiFetch<WakaTimeConnectionResponse | undefined>(
    "/integrations/wakatime",
  );
  return connection ?? null;
}
