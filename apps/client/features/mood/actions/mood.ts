"use server";

import {
  MOOD_LABELS,
  type MoodLabel,
  type MoodResponse,
} from "@repo/contracts";
import { revalidatePath } from "next/cache";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";
import { validId, validRevision } from "@/lib/validation";

export type MoodMutationResult =
  | { status: "success"; mood: MoodResponse }
  | MutationError;

export type MoodRemoveResult = { status: "success" } | MutationError;

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
    !validId(input.journalEntryId) ||
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
    return toMutationError(error);
  }
}

export async function removeMood(input: {
  journalEntryId: string;
  expectedRevision: number;
}): Promise<MoodRemoveResult> {
  if (
    !validId(input.journalEntryId) ||
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
    return toMutationError(error);
  }
}
