import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAvailableRoutineHabits } = vi.hoisted(() => ({
  getAvailableRoutineHabits: vi.fn(),
}));

vi.mock("@/features/routine/api/routine", () => ({
  getAvailableRoutineHabits,
}));

import { ApiError } from "@/lib/api";

import { GET } from "./route";

const context = {
  params: Promise.resolve({
    id: "routine-id",
  }),
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe("available Routine Habit options route", () => {
  it("loads normalized paginated options through the server adapter", async () => {
    getAvailableRoutineHabits.mockResolvedValue({
      data: [
        {
          id: "habit-id",
          title: "Drink water",
        },
      ],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 2,
      },
    });

    const response = await GET(
      new Request(
        "http://localhost/api/routines/routine-id/available-habits" +
          "?page=2&limit=10&search=%20%20water%20%20",
      ),
      context,
    );

    expect(getAvailableRoutineHabits).toHaveBeenCalledWith("routine-id", {
      page: 2,
      limit: 10,
      search: "water",
    });

    expect(response.status).toBe(200);

    await expect(response.json()).resolves.toEqual({
      data: [
        {
          id: "habit-id",
          title: "Drink water",
        },
      ],
      meta: {
        totalItems: 1,
        itemCount: 1,
        itemsPerPage: 10,
        totalPages: 1,
        currentPage: 2,
      },
    });
  });

  it.each([
    "?page=0",
    "?page=1.5",
    "?limit=0",
    "?limit=51",
    `?search=${"a".repeat(201)}`,
  ])("rejects invalid query parameters: %s", async (query) => {
    const response = await GET(
      new Request(
        `http://localhost/api/routines/routine-id/available-habits${query}`,
      ),
      context,
    );

    expect(response.status).toBe(400);
    expect(getAvailableRoutineHabits).not.toHaveBeenCalled();
  });

  it("returns a safe API error", async () => {
    getAvailableRoutineHabits.mockRejectedValue(
      new ApiError({
        kind: "not_found",
        status: 404,
        message: "Không tìm thấy dữ liệu được yêu cầu.",
        retryable: false,
      }),
    );

    const response = await GET(
      new Request("http://localhost/api/routines/routine-id/available-habits"),
      context,
    );

    expect(response.status).toBe(404);

    await expect(response.json()).resolves.toMatchObject({
      kind: "not_found",
    });
  });
});
