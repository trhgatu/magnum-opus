import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({ apiFetch: vi.fn() }));

vi.mock("@/lib/api", () => ({ apiFetch }));

import { getMood } from "./mood";

beforeEach(() => vi.clearAllMocks());

describe("Mood API", () => {
  it("returns the Mood attached to a Journal entry", async () => {
    const mood = { id: "mood-1", journalEntryId: "entry-1" };
    apiFetch.mockResolvedValue(mood);

    await expect(getMood("entry-1")).resolves.toBe(mood);
    expect(apiFetch).toHaveBeenCalledWith("/journal/entries/entry-1/mood");
  });

  it("normalizes a 204 response to null", async () => {
    apiFetch.mockResolvedValue(undefined);

    await expect(getMood("entry-1")).resolves.toBeNull();
  });
});
