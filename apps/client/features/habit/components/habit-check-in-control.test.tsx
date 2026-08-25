// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import { HabitCheckInControl } from "./habit-check-in-control";

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitCheckIn: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mutation = vi.mocked(changeHabitCheckIn);

describe("HabitCheckInControl", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  it("checks in and trusts the backend owner-timezone date", async () => {
    mutation.mockResolvedValue({
      status: "success",
      today: {
        date: "2026-08-26",
        checkedIn: true,
        checkIn: {
          id: "check-in",
          habitId: "550e8400-e29b-41d4-a716-446655440000",
          date: "2026-08-26",
          createdAt: "2026-08-25T17:00:00.000Z",
        },
      },
    });
    render(
      <HabitCheckInControl
        habitId="550e8400-e29b-41d4-a716-446655440000"
        initialToday={{ date: "2026-08-25", checkedIn: false, checkIn: null }}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hoàn thành hôm nay" }));
    await waitFor(() =>
      expect(
        screen.getByRole("button", { name: "Hoàn tác hôm nay" }),
      ).toBeInTheDocument(),
    );
    expect(screen.getByText("Ngày nghiệp vụ: 2026-08-26")).toBeInTheDocument();
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not call the action for an archived Habit", () => {
    render(
      <HabitCheckInControl
        habitId="550e8400-e29b-41d4-a716-446655440000"
        initialToday={{ date: "2026-08-25", checkedIn: false, checkIn: null }}
        disabled
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Hoàn thành hôm nay" }));
    expect(mutation).not.toHaveBeenCalled();
  });
});
