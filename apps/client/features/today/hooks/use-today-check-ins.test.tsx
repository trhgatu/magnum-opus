// @vitest-environment jsdom

import type { ForgeTodayResponse } from "@repo/contracts";
import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import { useTodayCheckIns } from "./use-today-check-ins";

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitCheckIn: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh,
  }),
}));

const mutation = vi.mocked(changeHabitCheckIn);

describe("useTodayCheckIns", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  it("initializes one shared state per Habit ID", () => {
    const { result } = renderHook(() => useTodayCheckIns(createToday()));

    expect(result.current.checkedInByHabitId).toEqual({
      "habit-shared": false,
      "habit-standalone": false,
    });
  });

  it("updates every appearance through the shared Habit state", async () => {
    mutation.mockResolvedValue({
      status: "success",
      today: {
        date: "2026-08-31",
        checkedIn: true,
        checkIn: {
          id: "check-in-id",
          habitId: "habit-shared",
          date: "2026-08-31",
          createdAt: "2026-08-31T08:00:00.000Z",
        },
      },
    });

    const { result } = renderHook(() => useTodayCheckIns(createToday()));

    await act(async () => {
      await result.current.toggleHabit("habit-shared");
    });

    expect(mutation).toHaveBeenCalledWith({
      id: "habit-shared",
      action: "check-in",
    });

    expect(result.current.checkedInByHabitId["habit-shared"]).toBe(true);

    expect(refresh).toHaveBeenCalledOnce();
  });

  it("exposes a safe error without changing checked state", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "Không thể ghi dấu hôm nay.",
    });

    const { result } = renderHook(() => useTodayCheckIns(createToday()));

    await act(async () => {
      await result.current.toggleHabit("habit-shared");
    });

    expect(result.current.checkedInByHabitId["habit-shared"]).toBe(false);

    expect(result.current.errorsByHabitId["habit-shared"]).toBe(
      "Không thể ghi dấu hôm nay.",
    );

    expect(refresh).not.toHaveBeenCalled();
  });

  it("blocks duplicate mutations for the same Habit", async () => {
    let resolveMutation:
      | ((value: Awaited<ReturnType<typeof changeHabitCheckIn>>) => void)
      | undefined;

    mutation.mockImplementation(
      () =>
        new Promise((resolve) => {
          resolveMutation = resolve;
        }),
    );

    const { result } = renderHook(() => useTodayCheckIns(createToday()));

    let firstMutation: Promise<void>;

    act(() => {
      firstMutation = result.current.toggleHabit("habit-shared");

      void result.current.toggleHabit("habit-shared");
    });

    expect(mutation).toHaveBeenCalledTimes(1);

    expect(result.current.pendingHabitIds.has("habit-shared")).toBe(true);

    await act(async () => {
      resolveMutation?.({
        status: "success",
        today: {
          date: "2026-08-31",
          checkedIn: true,
          checkIn: null,
        },
      });

      await firstMutation!;
    });

    await waitFor(() => {
      expect(result.current.pendingHabitIds.has("habit-shared")).toBe(false);
    });
  });
});

function createToday(): ForgeTodayResponse {
  const sharedHabit = {
    id: "habit-shared",
    title: "Drink water",
    description: null,
    checkedIn: false,
  };

  return {
    date: "2026-08-31",
    timeZone: "Asia/Bangkok",
    emptyReason: null,
    routines: [
      {
        id: "routine-morning",
        title: "Morning",
        habits: [sharedHabit],
      },
      {
        id: "routine-health",
        title: "Health",
        habits: [sharedHabit],
      },
    ],
    standaloneHabits: [
      {
        id: "habit-standalone",
        title: "Journal",
        description: null,
        checkedIn: false,
      },
    ],
  };
}
