"use server";

import type {
  HabitCheckInTodayResponse,
  HabitFrequencyType,
  HabitProgressResponse,
  HabitResponse,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { normalizeFrequencyDays } from "@/features/habit/lib/habit-frequency";
import { apiFetch, type MutationError, toMutationError } from "@/lib/api";
import { validId, validRevision } from "@/lib/validation";

export type HabitMutationResult =
  | { status: "success"; habit: HabitResponse }
  | MutationError;

export type HabitCheckInMutationResult =
  | { status: "success"; today: HabitCheckInTodayResponse }
  | MutationError;

export type HabitProgressMutationResult =
  | { status: "success"; progress: HabitProgressResponse }
  | MutationError;

export type HabitFormInput =
  | {
      type: "BUILD";
      title: string;
      description: string | null;
      frequencyType: HabitFrequencyType;
      frequencyDays: number[];
    }
  | {
      type: "QUIT";
      title: string;
      description: string | null;
      quitStartedAt: string;
    };

export type UpdateHabitInput = HabitFormInput & {
  id: string;
  expectedRevision: number;
};

export interface HabitRevisionInput {
  id: string;
  expectedRevision: number;
}

function normalizeTitleAndDescription(input: {
  title: string;
  description: string | null;
}) {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  const description =
    typeof input.description === "string"
      ? input.description.trim() || null
      : null;

  if (!title || [...title].length > 200) {
    return null;
  }

  return { title, description };
}

const normalizeForm = (input: HabitFormInput) => {
  const base = normalizeTitleAndDescription(input);
  if (!base) return null;

  if (input.type === "BUILD") {
    const frequencyDays = normalizeFrequencyDays(
      input.frequencyType,
      Array.isArray(input.frequencyDays) ? input.frequencyDays : [],
    );

    if (
      (input.frequencyType !== "DAILY" && input.frequencyType !== "WEEKLY") ||
      (input.frequencyType === "WEEKLY" && frequencyDays.length === 0)
    ) {
      return null;
    }

    return {
      ...base,
      frequencyType: input.frequencyType,
      frequencyDays,
      type: "BUILD" as const,
    };
  }

  const quitStartedAt =
    typeof input.quitStartedAt === "string" ? input.quitStartedAt.trim() : "";
  if (!quitStartedAt) {
    return null;
  }

  return { ...base, quitStartedAt, type: "QUIT" as const };
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
    return toMutationError(error);
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
    return toMutationError(error);
  }
}

export async function updateHabit(
  input: UpdateHabitInput,
): Promise<HabitMutationResult> {
  const body = normalizeForm(input);
  if (!validId(input.id) || !validRevision(input.expectedRevision) || !body) {
    return { status: "error", message: "Dữ liệu thói quen không hợp lệ." };
  }

  // UpdateHabitDto không khai báo field `type` (bất biến sau khi tạo,
  // KD-HAB2-008) — global ValidationPipe dùng forbidNonWhitelisted, gửi
  // kèm `type` sẽ bị 400.
  const { type: _type, ...rest } = body;
  void _type;

  try {
    const habit = await apiFetch<HabitResponse>(`/habits/${input.id}`, {
      method: "PUT",
      body: JSON.stringify({
        ...rest,
        expectedRevision: input.expectedRevision,
      }),
    });
    revalidateHabit(input.id);
    return { status: "success", habit };
  } catch (error) {
    return toMutationError(error);
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
    return toMutationError(error);
  }
}

export async function changeHabitCheckIn(input: {
  id: string;
  action: "check-in" | "undo";
}): Promise<HabitCheckInMutationResult> {
  if (!validId(input.id)) {
    return { status: "error", message: "Dữ liệu thói quen không hợp lệ." };
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
    return toMutationError(error);
  }
}

export async function logHabitRelapse(
  id: string,
): Promise<HabitProgressMutationResult> {
  if (!validId(id)) {
    return { status: "error", message: "Dữ liệu thói quen không hợp lệ." };
  }

  try {
    await apiFetch(`/habits/${id}/relapses`, { method: "POST" });
    const progress = await apiFetch<HabitProgressResponse>(
      `/habits/${id}/progress`,
    );
    revalidateHabit(id);
    return { status: "success", progress };
  } catch (error) {
    return toMutationError(error);
  }
}
