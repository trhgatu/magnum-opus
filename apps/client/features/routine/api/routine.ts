import "server-only";

import type {
  RoutineDetailResponse,
  RoutineHabitOptionResponse,
  RoutineResponse,
} from "@repo/contracts";
import type { PaginatedResult } from "@repo/types";

import type {
  RoutineSortField,
  RoutineSortOrder,
  RoutineStatus,
} from "../lib/routine-url";
import { apiFetch } from "@/lib/api";

export interface RoutineListInput {
  page?: number;
  limit?: number;
  search?: string;
  status?: RoutineStatus;
  sortBy?: RoutineSortField;
  sortOrder?: RoutineSortOrder;
}

export interface AvailableRoutineHabitListInput {
  page?: number;
  limit?: number;
  search?: string;
}

export async function getRoutines(
  input: RoutineListInput = {},
): Promise<PaginatedResult<RoutineResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  const search = input.search?.trim();

  if (search) params.set("search", search);
  if (input.status) params.set("status", input.status);
  if (input.sortBy) params.set("sortBy", input.sortBy);
  if (input.sortOrder) params.set("sortOrder", input.sortOrder);

  return apiFetch<PaginatedResult<RoutineResponse>>(
    `/routines?${params.toString()}`,
  );
}

export function getRoutine(id: string): Promise<RoutineDetailResponse> {
  return apiFetch<RoutineDetailResponse>(`/routines/${id}`);
}

export async function getAvailableRoutineHabits(
  routineId: string,
  input: AvailableRoutineHabitListInput = {},
): Promise<PaginatedResult<RoutineHabitOptionResponse>> {
  const params = new URLSearchParams({
    page: String(input.page ?? 1),
    limit: String(input.limit ?? 20),
  });

  const search = input.search?.trim();

  if (search) {
    params.set("search", search);
  }

  return apiFetch<PaginatedResult<RoutineHabitOptionResponse>>(
    `/routines/${routineId}/available-habits?${params.toString()}`,
  );
}
