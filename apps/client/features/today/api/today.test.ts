import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

import { getOnThisDay, getToday } from "./today";

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

  it("loads this day in past years for the authenticated owner", async () => {
    const onThisDay = { date: "2026-11-10", items: [] };
    apiFetch.mockResolvedValue(onThisDay);

    await expect(getOnThisDay()).resolves.toBe(onThisDay);
    expect(apiFetch).toHaveBeenCalledWith("/reflection/on-this-day");
  });
});
