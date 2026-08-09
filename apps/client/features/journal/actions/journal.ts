"use server";

import type { JournalEntryResponse } from "@repo/contracts";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { ApiError, apiFetch, toPublicApiError } from "@/lib/api";

export type JournalLifecycleAction = "seal" | "reopen" | "trash" | "restore";

interface JournalMutationError {
  status: "error";
  message: string;
  code?: string;
  correlationId?: string;
}

export type JournalMutationResult =
  | { status: "success"; entry: JournalEntryResponse }
  | JournalMutationError;

export type JournalDeleteResult = { status: "success" } | JournalMutationError;

const failure = (error: unknown): JournalMutationResult => {
  const publicError = toPublicApiError(error);
  return {
    status: "error",
    message: publicError.message,
    ...(error instanceof ApiError && error.code ? { code: error.code } : {}),
    ...(publicError.correlationId
      ? { correlationId: publicError.correlationId }
      : {}),
  };
};

const validRevision = (revision: number) =>
  Number.isInteger(revision) && revision >= 1;

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
  redirect("/journal/" + entry.id);
}

export async function updateJournalEntry(input: {
  id: string;
  title: string | null;
  content: string;
  expectedRevision: number;
}): Promise<JournalMutationResult> {
  if (
    !input.id ||
    (input.title !== null && input.title.length > 200) ||
    typeof input.content !== "string" ||
    !validRevision(input.expectedRevision)
  ) {
    return { status: "error", message: "Dữ liệu bản ghi không hợp lệ." };
  }

  try {
    const entry = await apiFetch<JournalEntryResponse>(
      "/journal/entries/" + input.id,
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
    revalidatePath("/journal/" + input.id);
    return { status: "success", entry };
  } catch (error) {
    return failure(error);
  }
}

export async function changeJournalEntryState(input: {
  id: string;
  action: JournalLifecycleAction;
  expectedRevision: number;
}): Promise<JournalMutationResult> {
  if (!input.id || !validRevision(input.expectedRevision)) {
    return { status: "error", message: "Dữ liệu bản ghi không hợp lệ." };
  }

  try {
    const entry = await apiFetch<JournalEntryResponse>(
      "/journal/entries/" + input.id + "/" + input.action,
      {
        method: "PATCH",
        body: JSON.stringify({ expectedRevision: input.expectedRevision }),
      },
    );
    revalidatePath("/journal");
    revalidatePath("/journal/" + input.id);
    return { status: "success", entry };
  } catch (error) {
    return failure(error);
  }
}

export async function deleteJournalEntryPermanently(input: {
  id: string;
  expectedRevision: number;
}): Promise<JournalDeleteResult> {
  if (!input.id || !validRevision(input.expectedRevision)) {
    return { status: "error", message: "Dữ liệu bản ghi không hợp lệ." };
  }

  try {
    await apiFetch<void>(
      "/journal/entries/" +
        input.id +
        "?expectedRevision=" +
        input.expectedRevision,
      { method: "DELETE" },
    );
    revalidatePath("/journal");
    return { status: "success" };
  } catch (error) {
    const result = failure(error);
    return result.status === "error"
      ? result
      : { status: "error", message: "Không thể xóa bản ghi." };
  }
}
