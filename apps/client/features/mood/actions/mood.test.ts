import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch, revalidatePath } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
  revalidatePath: vi.fn(),
}));

vi.mock("next/cache", () => ({ revalidatePath }));
vi.mock("@/lib/api", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/api")>();
  return { ...actual, apiFetch };
});

import { ApiError } from "@/lib/api";
import { removeMood, setMood } from "./mood";

const mood = {
  id: "7ed07de6-dda8-4ab9-a21c-900a4d75ddaf",
  journalEntryId: "36cbf877-1462-42bd-b18a-42577960784a",
  label: "CALM" as const,
  intensity: 3,
  note: "Quiet after the rain",
  revision: 2,
  createdAt: "2026-08-10T00:00:00.000Z",
  updatedAt: "2026-08-10T00:01:00.000Z",
};

beforeEach(() => vi.clearAllMocks());

describe("Mood Server Actions", () => {
  it("creates a Mood without an expected revision", async () => {
    apiFetch.mockResolvedValue({ ...mood, revision: 1 });

    await expect(
      setMood({
        journalEntryId: mood.journalEntryId,
        label: "CALM",
        intensity: 3,
        note: "  Quiet after the rain  ",
      }),
    ).resolves.toMatchObject({ status: "success" });

    expect(apiFetch).toHaveBeenCalledWith(
      `/journal/entries/${mood.journalEntryId}/mood`,
      {
        method: "PUT",
        body: JSON.stringify({
          label: "CALM",
          intensity: 3,
          note: "Quiet after the rain",
        }),
      },
    );
  });

  it("updates a Mood with its independent revision", async () => {
    apiFetch.mockResolvedValue(mood);

    await setMood({
      journalEntryId: mood.journalEntryId,
      label: "HOPEFUL",
      intensity: 4,
      note: null,
      expectedRevision: 1,
    });

    expect(apiFetch).toHaveBeenCalledWith(
      `/journal/entries/${mood.journalEntryId}/mood`,
      expect.objectContaining({
        body: JSON.stringify({
          label: "HOPEFUL",
          intensity: 4,
          note: null,
          expectedRevision: 1,
        }),
      }),
    );
  });

  it("preserves the backend conflict code", async () => {
    apiFetch.mockRejectedValue(
      new ApiError({
        kind: "conflict",
        status: 409,
        code: "MOOD_REVISION_CONFLICT",
        message: "safe conflict",
      }),
    );

    await expect(
      setMood({
        journalEntryId: mood.journalEntryId,
        label: "CALM",
        intensity: null,
        note: null,
        expectedRevision: 1,
      }),
    ).resolves.toMatchObject({
      status: "error",
      code: "MOOD_REVISION_CONFLICT",
    });
  });

  it("rejects invalid input before contacting the API", async () => {
    await expect(
      setMood({
        journalEntryId: mood.journalEntryId,
        label: "CALM",
        intensity: 6,
        note: null,
      }),
    ).resolves.toEqual({
      status: "error",
      message: "Dữ liệu mood không hợp lệ.",
    });

    expect(apiFetch).not.toHaveBeenCalled();
  });

  it("removes a Mood with its expected revision", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(
      removeMood({
        journalEntryId: mood.journalEntryId,
        expectedRevision: 2,
      }),
    ).resolves.toEqual({ status: "success" });

    expect(apiFetch).toHaveBeenCalledWith(
      `/journal/entries/${mood.journalEntryId}/mood?expectedRevision=2`,
      { method: "DELETE" },
    );
  });
});
