import "server-only";

import type {
  HabitCheckInHistoryResponse,
  HabitCheckInTodayResponse,
  HabitResponse,
} from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";

import type {
  HabitSortField,
  HabitSortOrder,
  HabitStatus,
} from "@/features/habit/lib/habit-url";
import { apiFetch } from "@/lib/api";

export interface HabitListInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: HabitStatus;
  sortBy?: HabitSortField;
  sortOrder?: HabitSortOrder;
}

export async function getHabits(
  input: HabitListInput = {},
): Promise<PaginatedResult<HabitResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });
  const search = input.search?.trim();

  if (search) params.set("search", search);
  if (input.status) params.set("status", input.status);
  if (input.sortBy) params.set("sortBy", input.sortBy);
  if (input.sortOrder) params.set("sortOrder", input.sortOrder);

  return apiFetch<PaginatedResult<HabitResponse>>(
    `/habits?${params.toString()}`,
  );
}

export function getHabit(id: string): Promise<HabitResponse> {
  return apiFetch<HabitResponse>(`/habits/${id}`);
}

export function getHabitCheckInToday(
  id: string,
): Promise<HabitCheckInTodayResponse> {
  return apiFetch<HabitCheckInTodayResponse>(`/habits/${id}/check-ins/today`);
}

export function getHabitCheckInHistory(
  id: string,
  from: string,
  to: string,
): Promise<HabitCheckInHistoryResponse> {
  const params = new URLSearchParams({ from, to });
  return apiFetch<HabitCheckInHistoryResponse>(
    `/habits/${id}/check-ins?${params.toString()}`,
  );
}
