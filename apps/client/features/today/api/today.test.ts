import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

import { getToday } from "./today";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Today API adapter", () => {
  it("loads the authenticated owner Today without sending owner identity", async () => {
    const today = {
      date: "2026-08-31",
      timeZone: "Asia/Bangkok",
      emptyReason: null,
      routines: [],
      standaloneHabits: [],
    };

    apiFetch.mockResolvedValue(today);

    const result = await getToday();

    expect(apiFetch).toHaveBeenCalledWith("/forge/today");

    expect(apiFetch).toHaveBeenCalledTimes(1);
    expect(result).toBe(today);
  });
});
