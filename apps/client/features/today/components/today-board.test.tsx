// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { ForgeTodayResponse } from "@repo/contracts";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import { TodayBoard } from "./today-board";

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitCheckIn: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mutation = vi.mocked(changeHabitCheckIn);

describe("TodayBoard", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  it("updates every appearance of a shared Habit from one mutation", async () => {
    mutation.mockResolvedValue({
      status: "success",
      today: {
        date: "2026-08-31",
        checkedIn: true,
        checkIn: null,
      },
    });

    render(<TodayBoard today={createToday()} />);

    expect(
      screen.getAllByRole("button", { name: "Ghi dấu Drink water" }),
    ).toHaveLength(2);

    fireEvent.click(
      screen.getAllByRole("button", { name: "Ghi dấu Drink water" })[0]!,
    );

    await waitFor(() => {
      expect(
        screen.getAllByRole("button", { name: "Hoàn tác Drink water" }),
      ).toHaveLength(2);
    });

    expect(mutation).toHaveBeenCalledOnce();
    expect(refresh).toHaveBeenCalledOnce();
  });
});

function createToday(): ForgeTodayResponse {
  const sharedHabit = {
    id: "habit-shared",
    title: "Drink water",
    description: "One glass",
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
    standaloneHabits: [],
  };
}
