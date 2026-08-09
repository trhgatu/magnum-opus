import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, revalidatePath, redirect } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  revalidatePath: vi.fn(),
  redirect: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("next/navigation", () => ({ redirect }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch };
});

import { ApiError } from "@/lib/api";
import {
  changeJournalEntryState,
  deleteJournalEntryPermanently,
  updateJournalEntry,
} from "./journal";

const entry = {
  id: "36cbf877-1462-42bd-b18a-42577960784a",
  title: "A thought",
  content: "Something worth keeping",
  state: "DRAFT" as const,
  stateBeforeTrash: null,
  revision: 2,
  trashedAt: null,
  createdAt: "2026-08-09T00:00:00.000Z",
  updatedAt: "2026-08-09T00:01:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("Journal Server Actions", () => {
  it("sends the complete draft and expected revision when autosaving", async () => {
    apiFetch.mockResolvedValue(entry);

    await expect(
      updateJournalEntry({
        id: entry.id,
        title: entry.title,
        content: entry.content,
        expectedRevision: 1,
      }),
    ).resolves.toEqual({ status: "success", entry });

    expect(apiFetch).toHaveBeenCalledWith("/journal/entries/" + entry.id, {
      method: "PUT",
      body: JSON.stringify({
        title: entry.title,
        content: entry.content,
        expectedRevision: 1,
      }),
    });
  });

  it("preserves the backend conflict code for autosave recovery", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "JOURNAL_ENTRY_REVISION_CONFLICT",
        message: "safe conflict",
      }),
    );

    await expect(
      updateJournalEntry({
        id: entry.id,
        title: null,
        content: "local content",
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({
      status: "error",
      code: "JOURNAL_ENTRY_REVISION_CONFLICT",
    });
  });

  it("uses an explicit lifecycle endpoint and revision", async () => {
    apiFetch.mockResolvedValue({ ...entry, state: "SEALED", revision: 3 });

    await changeJournalEntryState({
      id: entry.id,
      action: "seal",
      expectedRevision: 2,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/journal/entries/" + entry.id + "/seal",
      {
        method: "PATCH",
        body: JSON.stringify({ expectedRevision: 2 }),
      },
    );
  });

  it("permanently deletes through the revision-protected endpoint", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(
      deleteJournalEntryPermanently({ id: entry.id, expectedRevision: 4 }),
    ).resolves.toEqual({ status: "success" });

    expect(apiFetch).toHaveBeenCalledWith(
      "/journal/entries/" + entry.id + "?expectedRevision=4",
      { method: "DELETE" },
    );
  });
});
