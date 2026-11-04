import "server-only";

import type { JournalEntryResponse, JournalEntryState } from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";

import { apiFetch } from "@/lib/api";

export interface JournalEntryListInput {
  page?: number;
  limit?: number;
  search?: string;
  state?: JournalEntryState;
  /** Mặc định server sắp theo updatedAt. */
  sortBy?: "createdAt" | "updatedAt";
}

export async function getJournalEntries(
  input: JournalEntryListInput = {},
): Promise<PaginatedResult<JournalEntryResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.state) params.set("state", input.state);
  if (input.sortBy) params.set("sortBy", input.sortBy);

  return apiFetch<PaginatedResult<JournalEntryResponse>>(
    "/journal/entries?" + params.toString(),
  );
}

export function getJournalEntry(id: string): Promise<JournalEntryResponse> {
  return apiFetch<JournalEntryResponse>("/journal/entries/" + id);
}
