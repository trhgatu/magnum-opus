import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

import { getHabitOverview, getHabits } from "./habit";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Habit API adapter", () => {
  it("reads the overview of active habits", async () => {
    apiFetch.mockResolvedValue({
      date: "2026-11-02",
      timeZone: "UTC",
      habits: [],
    });

    await getHabitOverview();

    expect(apiFetch).toHaveBeenCalledWith("/habits/overview");
  });

  it("encodes the archived list with a trimmed search", async () => {
    apiFetch.mockResolvedValue({ data: [], meta: {} });

    await getHabits({
      page: 2,
      limit: 20,
      search: "  thiền ",
      status: "ARCHIVED",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/habits?page=2&limit=20&search=thi%E1%BB%81n&status=ARCHIVED",
    );
  });

  it("leaves out an empty search and status", async () => {
    apiFetch.mockResolvedValue({ data: [], meta: {} });

    await getHabits();

    expect(apiFetch).toHaveBeenCalledWith("/habits?page=1&limit=20");
  });
});
