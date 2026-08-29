"use server";

import {
  MOOD_LABELS,
  type MoodLabel,
  type MoodResponse,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";

import {
  ApiError,
  apiFetch,
  type ApiErrorKind,
  toPublicApiError,
} from "@/lib/api";

interface MoodMutationError {
  status: "error";
  message: string;
  kind?: ApiErrorKind;
  code?: string;
  correlationId?: string;
}

export type MoodMutationResult =
  | { status: "success"; mood: MoodResponse }
  | MoodMutationError;

export type MoodRemoveResult = { status: "success" } | MoodMutationError;

const failure = (error: unknown): MoodMutationError => {
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

const validRevision = (revision: unknown): revision is number =>
  typeof revision === "number" && Number.isInteger(revision) && revision >= 1;

const validIntensity = (intensity: unknown): intensity is number | null =>
  intensity === null ||
  (typeof intensity === "number" &&
    Number.isInteger(intensity) &&
    intensity >= 1 &&
    intensity <= 5);

const validLabel = (label: unknown): label is MoodLabel =>
  typeof label === "string" &&
  (MOOD_LABELS as readonly string[]).includes(label);

export async function setMood(input: {
  journalEntryId: string;
  label: MoodLabel;
  intensity: number | null;
  note: string | null;
  expectedRevision?: number;
}): Promise<MoodMutationResult> {
  const normalizedNote =
    typeof input.note === "string" ? input.note.trim() || null : input.note;

  if (
    typeof input.journalEntryId !== "string" ||
    !input.journalEntryId ||
    !validLabel(input.label) ||
    !validIntensity(input.intensity) ||
    (input.note !== null && typeof input.note !== "string") ||
    (normalizedNote !== null && [...normalizedNote].length > 500) ||
    (input.expectedRevision !== undefined &&
      !validRevision(input.expectedRevision))
  ) {
    return { status: "error", message: "Dữ liệu tâm trạng không hợp lệ." };
  }

  try {
    const mood = await apiFetch<MoodResponse>(
      `/journal/entries/${input.journalEntryId}/mood`,
      {
        method: "PUT",
        body: JSON.stringify({
          label: input.label,
          intensity: input.intensity,
          note: normalizedNote,
          ...(input.expectedRevision === undefined
            ? {}
            : { expectedRevision: input.expectedRevision }),
        }),
      },
    );

    revalidatePath(`/journal/${input.journalEntryId}`);
    return { status: "success", mood };
  } catch (error) {
    return failure(error);
  }
}

export async function removeMood(input: {
  journalEntryId: string;
  expectedRevision: number;
}): Promise<MoodRemoveResult> {
  if (
    typeof input.journalEntryId !== "string" ||
    !input.journalEntryId ||
    !validRevision(input.expectedRevision)
  ) {
    return { status: "error", message: "Dữ liệu tâm trạng không hợp lệ." };
  }

  try {
    await apiFetch<void>(
      `/journal/entries/${input.journalEntryId}/mood?expectedRevision=${input.expectedRevision}`,
      { method: "DELETE" },
    );

    revalidatePath(`/journal/${input.journalEntryId}`);
    return { status: "success" };
  } catch (error) {
    return failure(error);
  }
}
