import "server-only";

import type {
  HabitOverviewItemEnvelope,
  HabitOverviewResponse,
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

/** Một Habit (kể cả đã lưu trữ) kèm chuỗi và 13 tuần dấu vết, cho trang chi tiết. */
export function getHabitOverviewItem(
  id: string,
): Promise<HabitOverviewItemEnvelope> {
  return apiFetch<HabitOverviewItemEnvelope>(`/habits/${id}/overview`);
}
