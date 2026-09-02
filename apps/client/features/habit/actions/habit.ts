"use server";

import type {
  HabitCheckInTodayResponse,
  HabitFrequencyType,
  HabitResponse,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { normalizeFrequencyDays } from "@/features/habit/lib/habit-frequency";
import {
  ApiError,
  apiFetch,
  type ApiErrorKind,
  toPublicApiError,
} from "@/lib/api";

interface HabitMutationError {
  status: "error";
  message: string;
  kind?: ApiErrorKind;
  code?: string;
  correlationId?: string;
}

export type HabitMutationResult =
  | { status: "success"; habit: HabitResponse }
  | HabitMutationError;

export type HabitCheckInMutationResult =
  | { status: "success"; today: HabitCheckInTodayResponse }
  | HabitMutationError;

export interface HabitFormInput {
  title: string;
  description: string | null;
  frequencyType: HabitFrequencyType;
  frequencyDays: number[];
}

export interface UpdateHabitInput extends HabitFormInput {
  id: string;
  expectedRevision: number;
}

export interface HabitRevisionInput {
  id: string;
  expectedRevision: number;
}

const UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

const validId = (value: unknown): value is string =>
  typeof value === "string" && UUID_PATTERN.test(value);

const validRevision = (value: unknown): value is number =>
  typeof value === "number" && Number.isInteger(value) && value >= 1;

const normalizeForm = (input: HabitFormInput) => {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string"
      ? input.description.trim() || null
      : null;
  const frequencyType = input.frequencyType;
  const frequencyDays = normalizeFrequencyDays(
    frequencyType,
    Array.isArray(input.frequencyDays) ? input.frequencyDays : [],
  );

  if (
    !title ||
    [...title].length > 200 ||
    (frequencyType !== "DAILY" && frequencyType !== "WEEKLY") ||
    (frequencyType === "WEEKLY" && frequencyDays.length === 0)
  ) {
    return null;
  }

  return { title, description, frequencyType, frequencyDays };
};

const failure = (error: unknown): HabitMutationError => {
  const publicError = toPublicApiError(error);
  return {
    status: "error",
    message: publicError.message,
    kind: publicError.kind,
    ...(error instanceof ApiError && error.code ? { code: error.code } : {}),
    ...(publicError.correlationId
      ? { correlationId: publicError.correlationId }
      : {}),
  };
};

const revalidateHabit = (id: string) => {
  revalidatePath("/habits");
  revalidatePath(`/habits/${id}`);
};

export async function createHabit(
  input: HabitFormInput,
): Promise<HabitMutationResult> {
  const body = normalizeForm(input);
  if (!body) {
    return { status: "error", message: "Dữ liệu thói quen không hợp lệ." };
  }

  try {
    const habit = await apiFetch<HabitResponse>("/habits", {
      method: "POST",
      body: JSON.stringify(body),
    });
    revalidatePath("/habits");
    return { status: "success", habit };
  } catch (error) {
    return failure(error);
  }
}

export async function reloadHabit(id: string): Promise<HabitMutationResult> {
  if (!validId(id)) {
    return { status: "error", message: "Dữ liệu thói quen không hợp lệ." };
  }

  try {
    const habit = await apiFetch<HabitResponse>(`/habits/${id}`);
    return { status: "success", habit };
  } catch (error) {
    return failure(error);
  }
}

export async function updateHabit(
  input: UpdateHabitInput,
): Promise<HabitMutationResult> {
  const body = normalizeForm(input);
  if (!validId(input.id) || !validRevision(input.expectedRevision) || !body) {
    return { status: "error", message: "Dữ liệu thói quen không hợp lệ." };
  }

  try {
    const habit = await apiFetch<HabitResponse>(`/habits/${input.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...body,
        expectedRevision: input.expectedRevision,
      }),
    });
    revalidateHabit(input.id);
    return { status: "success", habit };
  } catch (error) {
    return failure(error);
  }
}

export async function changeHabitState(
  input: HabitRevisionInput & { action: "archive" | "restore" },
): Promise<HabitMutationResult> {
  if (!validId(input.id) || !validRevision(input.expectedRevision)) {
    return { status: "error", message: "Dữ liệu thói quen không hợp lệ." };
  }

  try {
    const habit = await apiFetch<HabitResponse>(
      `/habits/${input.id}/${input.action}`,
      {
        method: "PATCH",
        body: JSON.stringify({ expectedRevision: input.expectedRevision }),
      },
    );
    revalidateHabit(input.id);
    return { status: "success", habit };
  } catch (error) {
    return failure(error);
  }
}

export async function changeHabitCheckIn(input: {
  id: string;
  action: "check-in" | "undo";
}): Promise<HabitCheckInMutationResult> {
  if (!validId(input.id)) {
    return { status: "error", message: "Thói quen không hợp lệ." };
  }

  try {
    await apiFetch(`/habits/${input.id}/check-ins/today`, {
      method: input.action === "check-in" ? "PUT" : "DELETE",
    });
    const today = await apiFetch<HabitCheckInTodayResponse>(
      `/habits/${input.id}/check-ins/today`,
    );
    revalidateHabit(input.id);
    return { status: "success", today };
  } catch (error) {
    return failure(error);
  }
}
