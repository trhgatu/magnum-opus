"use server";

import type { RoutineDetailResponse, RoutineResponse } from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";
import { validId, validRevision } from "@/lib/validation";

export type RoutineMutationResult =
  | {
      status: "success";
      routine: RoutineResponse;
    }
  | MutationError;

export type ReloadRoutineResult =
  | {
      status: "success";
      routine: RoutineDetailResponse;
    }
  | MutationError;

export interface CreateRoutineInput {
  title: string;
}

export interface UpdateRoutineTitleInput {
  id: string;
  title: string;
  expectedRevision: number;
}

export interface RoutineRevisionInput {
  id: string;
  expectedRevision: number;
}

export interface RoutineHabitInput {
  routineId: string;
  habitId: string;
  expectedRevision: number;
}

export type RoutineHabitMoveDirection = "up" | "down";

export type RoutineLifecycleAction = "archive" | "restore";

const validMoveDirection = (
  value: unknown,
): value is RoutineHabitMoveDirection => value === "up" || value === "down";

const validLifecycleAction = (
  value: unknown,
): value is RoutineLifecycleAction =>
  value === "archive" || value === "restore";

const normalizeTitle = (value: unknown): string | null => {
  if (typeof value !== "string") {
    return null;
  }

  const title = value.trim();

  if (!title || [...title].length > 200) {
    return null;
  }

  return title;
};

const revalidateRoutine = (id: string) => {
  revalidatePath("/routines");
  revalidatePath(`/routines/${id}`);
};

export async function createRoutine(
  input: CreateRoutineInput,
): Promise<RoutineMutationResult> {
  const title = normalizeTitle(input.title);

  if (!title) {
    return {
      status: "error",
      message: "Tiêu đề Trình tự không hợp lệ.",
    };
  }

  try {
    const routine = await apiFetch<RoutineResponse>("/routines", {
      method: "POST",
      body: JSON.stringify({ title }),
    });

    revalidatePath("/routines");
    return {
      status: "success",
      routine,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function reloadRoutine(id: string): Promise<ReloadRoutineResult> {
  if (!validId(id)) {
    return {
      status: "error",
      message: "Dữ liệu Trình tự không hợp lệ.",
    };
  }

  try {
    const routine = await apiFetch<RoutineDetailResponse>(`/routines/${id}`);

    return {
      status: "success",
      routine,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function updateRoutineTitle(
  input: UpdateRoutineTitleInput,
): Promise<RoutineMutationResult> {
  const title = normalizeTitle(input.title);

  if (!validId(input.id) || !validRevision(input.expectedRevision) || !title) {
    return {
      status: "error",
      message: "Dữ liệu Trình tự không hợp lệ.",
    };
  }

  try {
    const routine = await apiFetch<RoutineResponse>(`/routines/${input.id}`, {
      method: "PUT",
      body: JSON.stringify({
        title,
        expectedRevision: input.expectedRevision,
      }),
    });

    revalidateRoutine(input.id);

    return {
      status: "success",
      routine,
    };
  } catch (error) {
    return toMutationError(error);
  }
}
export async function changeRoutineState(
  input: RoutineRevisionInput & {
    action: RoutineLifecycleAction;
  },
): Promise<RoutineMutationResult> {
  if (
    !validId(input.id) ||
    !validRevision(input.expectedRevision) ||
    !validLifecycleAction(input.action)
  ) {
    return {
      status: "error",
      message: "Dữ liệu Trình tự không hợp lệ.",
    };
  }

  try {
    const routine = await apiFetch<RoutineResponse>(
      `/routines/${input.id}/${input.action}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          expectedRevision: input.expectedRevision,
        }),
      },
    );

    revalidateRoutine(input.id);

    return {
      status: "success",
      routine,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function addRoutineHabit(
  input: RoutineHabitInput,
): Promise<RoutineMutationResult> {
  if (
    !validId(input.routineId) ||
    !validId(input.habitId) ||
    !validRevision(input.expectedRevision)
  ) {
    return {
      status: "error",
      message: "Dữ liệu Thói quen của Trình tự không hợp lệ.",
    };
  }

  try {
    const routine = await apiFetch<RoutineResponse>(
      `/routines/${input.routineId}/habits`,
      {
        method: "POST",
        body: JSON.stringify({
          habitId: input.habitId,
          expectedRevision: input.expectedRevision,
        }),
      },
    );

    revalidateRoutine(input.routineId);

    return {
      status: "success",
      routine,
    };
  } catch (error) {
    return toMutationError(error);
  }
}
export async function removeRoutineHabit(
  input: RoutineHabitInput,
): Promise<RoutineMutationResult> {
  if (
    !validId(input.routineId) ||
    !validId(input.habitId) ||
    !validRevision(input.expectedRevision)
  ) {
    return {
      status: "error",
      message: "Dữ liệu Thói quen của Trình tự không hợp lệ.",
    };
  }
  const params = new URLSearchParams({
    expectedRevision: String(input.expectedRevision),
  });

  try {
    const routine = await apiFetch<RoutineResponse>(
      `/routines/${input.routineId}/habits/${input.habitId}?${params.toString()}`,
      {
        method: "DELETE",
      },
    );

    revalidateRoutine(input.routineId);

    return {
      status: "success",
      routine,
    };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function moveRoutineHabit(
  input: RoutineHabitInput & {
    direction: RoutineHabitMoveDirection;
  },
): Promise<RoutineMutationResult> {
  if (
    !validId(input.routineId) ||
    !validId(input.habitId) ||
    !validRevision(input.expectedRevision) ||
    !validMoveDirection(input.direction)
  ) {
    return {
      status: "error",
      message: "Dữ liệu Thói quen của Trình tự không hợp lệ.",
    };
  }

  try {
    const routine = await apiFetch<RoutineResponse>(
      `/routines/${input.routineId}/habits/${input.habitId}/${input.direction}`,
      {
        method: "PATCH",
        body: JSON.stringify({
          expectedRevision: input.expectedRevision,
        }),
      },
    );

    revalidateRoutine(input.routineId);

    return {
      status: "success",
      routine,
    };
  } catch (error) {
    return toMutationError(error);
  }
}
