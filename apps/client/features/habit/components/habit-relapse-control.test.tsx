// @vitest-environment jsdom

import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { logHabitRelapse } from "@/features/habit/actions/habit";
import { HabitRelapseControl } from "./habit-relapse-control";

vi.mock("@/features/habit/actions/habit", () => ({
  logHabitRelapse: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mutation = vi.mocked(logHabitRelapse);

describe("HabitRelapseControl", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("shows the current streak and requires confirmation before logging a relapse", async () => {
    mutation.mockResolvedValue({
      status: "success",
      progress: {
        habitId: "550e8400-e29b-41d4-a716-446655440000",
        since: "2026-08-28",
        sinceReason: "RELAPSE",
        daysSince: 0,
      },
    });

    render(
      <HabitRelapseControl
        habitId="550e8400-e29b-41d4-a716-446655440000"
        initialProgress={{
          habitId: "550e8400-e29b-41d4-a716-446655440000",
          since: "2026-08-01",
          sinceReason: "QUIT_STARTED_AT",
          daysSince: 12,
        }}
      />,
    );

    expect(screen.getByText("12")).toBeTruthy();
    expect(mutation).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: "Tôi đã tái phạm" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận tái phạm" }));

    await waitFor(() => expect(screen.getByText("0")).toBeTruthy());
    expect(mutation).toHaveBeenCalledWith(
      "550e8400-e29b-41d4-a716-446655440000",
    );
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("does not open the confirm dialog for an archived Habit", () => {
    render(
      <HabitRelapseControl
        habitId="550e8400-e29b-41d4-a716-446655440000"
        initialProgress={{
          habitId: "550e8400-e29b-41d4-a716-446655440000",
          since: "2026-08-01",
          sinceReason: "QUIT_STARTED_AT",
          daysSince: 12,
        }}
        disabled
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: "Tôi đã tái phạm" }));
    expect(
      screen.queryByRole("button", { name: "Xác nhận tái phạm" }),
    ).toBeNull();
    expect(mutation).not.toHaveBeenCalled();
  });
});
