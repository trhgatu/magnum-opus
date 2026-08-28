import { beforeEach, describe, expect, it, vi } from "vitest";

const { apiFetch } = vi.hoisted(() => ({
  apiFetch: vi.fn(),
}));

vi.mock("@/lib/api", () => ({
  apiFetch,
}));

import { getAvailableRoutineHabits, getRoutine, getRoutines } from "./routine";

beforeEach(() => {
  vi.clearAllMocks();
});

describe("Routine API adapter", () => {
  it("encodes list filters without sending owner identity", async () => {
    apiFetch.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 20,
        totalPages: 0,
        currentPage: 2,
      },
    });

    await getRoutines({
      page: 2,
      limit: 20,
      search: "  morning ritual  ",
      status: "ARCHIVED",
      sortBy: "title",
      sortOrder: "asc",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/routines?page=2&limit=20&search=morning+ritual" +
        "&status=ARCHIVED&sortBy=title&sortOrder=asc",
    );
  });

  it("uses defaults and omits empty optional filters", async () => {
    apiFetch.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 20,
        totalPages: 0,
        currentPage: 1,
      },
    });

    await getRoutines({
      search: "   ",
    });

    expect(apiFetch).toHaveBeenCalledWith("/routines?page=1&limit=20");
  });

  it("loads the enriched owner-scoped Routine detail", async () => {
    apiFetch.mockResolvedValue({});

    await getRoutine("routine-id");

    expect(apiFetch).toHaveBeenCalledWith("/routines/routine-id");
  });

  it("loads paginated available Habit options for an owned Routine", async () => {
    apiFetch.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 10,
        totalPages: 0,
        currentPage: 2,
      },
    });

    await getAvailableRoutineHabits("routine-id", {
      page: 2,
      limit: 10,
      search: "  drink water  ",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/routines/routine-id/available-habits" +
        "?page=2&limit=10&search=drink+water",
    );
  });

  it("uses picker defaults and omits a blank search", async () => {
    apiFetch.mockResolvedValue({
      data: [],
      meta: {
        totalItems: 0,
        itemCount: 0,
        itemsPerPage: 20,
        totalPages: 0,
        currentPage: 1,
      },
    });

    await getAvailableRoutineHabits("routine-id", {
      search: "   ",
    });

    expect(apiFetch).toHaveBeenCalledWith(
      "/routines/routine-id/available-habits?page=1&limit=20",
    );
  });
});
