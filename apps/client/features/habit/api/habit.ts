import "server-only";

import type {
  HabitCheckInHistoryResponse,
  HabitCheckInTodayResponse,
  HabitOverviewResponse,
  HabitProgressResponse,
  HabitResponse,
} from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";

import type { HabitStatus } from "@/features/habit/lib/habit-url";
import { apiFetch } from "@/lib/api";

export interface HabitListInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: HabitStatus;
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

  return apiFetch<PaginatedResult<HabitResponse>>(
    `/habits?${params.toString()}`,
  );
}

/** Mọi Habit đang rèn kèm việc hôm nay, dải 7 ngày và chuỗi (BA habit v3). */
export function getHabitOverview(): Promise<HabitOverviewResponse> {
  return apiFetch<HabitOverviewResponse>("/habits/overview");
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

export function getHabitProgress(id: string): Promise<HabitProgressResponse> {
  return apiFetch<HabitProgressResponse>(`/habits/${id}/progress`);
}
