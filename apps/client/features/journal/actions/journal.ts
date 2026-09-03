"use server";

import type { JournalEntryResponse } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { apiFetch, type MutationError, toMutationError } from "@/lib/api";
import { validId, validRevision } from "@/lib/validation";

export type JournalLifecycleAction = "seal" | "reopen" | "trash" | "restore";

export type JournalMutationResult =
  | { status: "success"; entry: JournalEntryResponse }
  | MutationError;

export type JournalDeleteResult = { status: "success" } | MutationError;

export async function createJournalEntry(): Promise<void> {
  let entry: JournalEntryResponse | undefined;
  try {
    entry = await apiFetch<JournalEntryResponse>("/journal/entries", {
      method: "POST",
      body: JSON.stringify({}),
    });
  } catch {}

  if (!entry) redirect("/journal?createFailed=1");

  revalidatePath("/journal");
  redirect(`/journal/${entry.id}`);
}

export async function updateJournalEntry(input: {
  id: string;
  title: string | null;
  content: string;
  expectedRevision: number;
}): Promise<JournalMutationResult> {
  if (
    !validId(input.id) ||
    (input.title !== null && input.title.length > 200) ||
    typeof input.content !== "string" ||
    !validRevision(input.expectedRevision)
  ) {
    return { status: "error", message: "Dữ liệu bản ghi không hợp lệ." };
  }

  try {
    const entry = await apiFetch<JournalEntryResponse>(
      `/journal/entries/${input.id}`,
      {
        method: "PUT",
        body: JSON.stringify({
          title: input.title,
          content: input.content,
          expectedRevision: input.expectedRevision,
        }),
      },
    );
    revalidatePath("/journal");
    revalidatePath(`/journal/${input.id}`);
    return { status: "success", entry };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function reloadJournalEntry(
  id: string,
): Promise<JournalMutationResult> {
  if (!validId(id)) {
    return { status: "error", message: "Dữ liệu bản ghi không hợp lệ." };
  }

  try {
    const entry = await apiFetch<JournalEntryResponse>(
      `/journal/entries/${id}`,
    );
    return { status: "success", entry };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function changeJournalEntryState(input: {
  id: string;
  action: JournalLifecycleAction;
  expectedRevision: number;
}): Promise<JournalMutationResult> {
  if (!validId(input.id) || !validRevision(input.expectedRevision)) {
    return { status: "error", message: "Dữ liệu bản ghi không hợp lệ." };
  }

  try {
    const entry = await apiFetch<JournalEntryResponse>(
      `/journal/entries/${input.id}/${input.action}`,
      {
        method: "PATCH",
        body: JSON.stringify({ expectedRevision: input.expectedRevision }),
      },
    );
    revalidatePath("/journal");
    revalidatePath(`/journal/${input.id}`);
    return { status: "success", entry };
  } catch (error) {
    return toMutationError(error);
  }
}

export async function deleteJournalEntryPermanently(input: {
  id: string;
  expectedRevision: number;
}): Promise<JournalDeleteResult> {
  if (!validId(input.id) || !validRevision(input.expectedRevision)) {
    return { status: "error", message: "Dữ liệu bản ghi không hợp lệ." };
  }

  try {
    await apiFetch<void>(
      `/journal/entries/${input.id}?expectedRevision=${input.expectedRevision}`,
      { method: "DELETE" },
    );
  } catch (error) {
    return toMutationError(error);
  }

  revalidatePath("/journal");
  redirect("/journal?state=TRASHED");
}
