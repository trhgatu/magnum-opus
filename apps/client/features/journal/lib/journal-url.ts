import type { JournalEntryState } from "@repo/contracts";

export interface JournalLocation {
  page?: number;
  search?: string;
  state?: JournalEntryState;
}

export function buildJournalHref(input: JournalLocation = {}) {
  const params = new URLSearchParams();
  if (input.page && input.page > 1) params.set("page", String(input.page));
  if (input.search?.trim()) params.set("search", input.search.trim());
  if (input.state) params.set("state", input.state);
  const query = params.toString();
  return query ? `/journal?${query}` : "/journal";
}
