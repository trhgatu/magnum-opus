import "server-only";

import type { MoodResponse } from "@repo/contracts";

import { apiFetch } from "@/lib/api";

export async function getMood(
  journalEntryId: string,
): Promise<MoodResponse | null> {
  const mood = await apiFetch<MoodResponse | undefined>(
    `/journal/entries/${journalEntryId}/mood`,
  );

  return mood ?? null;
}
