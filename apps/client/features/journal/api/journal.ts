import "server-only";

import type {
  JournalEntryListItemResponse,
  JournalEntryResponse,
  JournalEntryState,
  JournalSummaryResponse,
} from "@repo/contracts";
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
): Promise<PaginatedResult<JournalEntryListItemResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.state) params.set("state", input.state);
  if (input.sortBy) params.set("sortBy", input.sortBy);

  return apiFetch<PaginatedResult<JournalEntryListItemResponse>>(
    "/journal/entries?" + params.toString(),
  );
}

/** Số ngày đã viết trong 7 ngày gần nhất, tính cả hôm nay. */
export function getJournalSummary(): Promise<JournalSummaryResponse> {
  return apiFetch<JournalSummaryResponse>("/journal/summary");
}

export function getJournalEntry(id: string): Promise<JournalEntryResponse> {
  return apiFetch<JournalEntryResponse>("/journal/entries/" + id);
}
