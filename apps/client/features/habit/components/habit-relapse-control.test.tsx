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
const HABIT_ID = "550e8400-e29b-41d4-a716-446655440000";

describe("HabitRelapseControl", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });

  afterEach(cleanup);

  it("asks for confirmation, then logs and reloads the streak", async () => {
    mutation.mockResolvedValue({ status: "success", progress: null });
    render(<HabitRelapseControl habitId={HABIT_ID} />);

    fireEvent.click(screen.getByRole("button", { name: "Tôi đã tái phạm" }));
    expect(mutation).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận tái phạm" }));

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith(HABIT_ID);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("keeps the dialog open with the error when logging fails", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "Không thể ghi nhận lúc này.",
    });
    render(<HabitRelapseControl habitId={HABIT_ID} />);

    fireEvent.click(screen.getByRole("button", { name: "Tôi đã tái phạm" }));
    fireEvent.click(screen.getByRole("button", { name: "Xác nhận tái phạm" }));

    expect(await screen.findByText("Không thể ghi nhận lúc này.")).toBeTruthy();
    expect(screen.getByRole("alertdialog")).toBeTruthy();
    expect(refresh).not.toHaveBeenCalled();
  });

  it("does not open the confirm dialog for an archived Habit", () => {
    render(<HabitRelapseControl habitId={HABIT_ID} disabled />);

    fireEvent.click(screen.getByRole("button", { name: "Tôi đã tái phạm" }));
    expect(
      screen.queryByRole("button", { name: "Xác nhận tái phạm" }),
    ).toBeNull();
    expect(mutation).not.toHaveBeenCalled();
  });
});
