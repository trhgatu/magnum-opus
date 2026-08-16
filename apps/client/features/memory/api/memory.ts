import "server-only";

import type { MemoryResponse, MemoryState } from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";

import type {
  MemorySortField,
  MemorySortOrder,
} from "@/features/memory/lib/memory-url";

import { apiFetch } from "@/lib/api";

export interface MemoryListInput {
  page?: number;
  limit?: number;
  search?: string;
  state?: MemoryState;
  sortBy?: MemorySortField;
  sortOrder?: MemorySortOrder;
}

export async function getMemories(
  input: MemoryListInput = {},
): Promise<PaginatedResult<MemoryResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  const search = input.search?.trim();

  if (search) params.set("search", search);
  if (input.state) params.set("state", input.state);
  if (input.sortBy) params.set("sortBy", input.sortBy);
  if (input.sortOrder) params.set("sortOrder", input.sortOrder);

  return apiFetch<PaginatedResult<MemoryResponse>>(
    `/memories?${params.toString()}`,
  );
}
export function getMemory(id: string): Promise<MemoryResponse> {
  return apiFetch<MemoryResponse>(`/memories/${id}`);
}
