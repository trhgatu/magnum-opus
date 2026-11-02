// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { HabitOverviewItemResponse } from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import { HabitOverviewRow } from "./habit-overview-row";

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitCheckIn: vi.fn(),
}));

const refresh = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

const mutation = vi.mocked(changeHabitCheckIn);

const HABIT_ID = "550e8400-e29b-41d4-a716-446655440000";

const habit = (
  overrides: Partial<HabitOverviewItemResponse> = {},
): HabitOverviewItemResponse => ({
  id: HABIT_ID,
  title: "Chạy bộ",
  description: null,
  type: "BUILD",
  frequencyType: "DAILY",
  frequencyDays: [],
  quitStartedAt: null,
  routines: [],
  dueToday: true,
  checkedInToday: false,
  checkedInAt: null,
  currentStreak: 4,
  longestStreak: 6,
  lastSevenDays: [
    { date: "2026-11-01", mark: "DONE" },
    { date: "2026-11-02", mark: "PENDING" },
  ],
  nextDueOn: "2026-11-03",
  ...overrides,
});

const renderRow = (overrides?: Partial<HabitOverviewItemResponse>) =>
  render(
    <ul>
      <HabitOverviewRow habit={habit(overrides)} description="Mỗi ngày" />
    </ul>,
  );

describe("HabitOverviewRow", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
  });
  afterEach(cleanup);

  it("fills the ring right away while the check-in is saved", async () => {
    let resolve!: (
      value: Awaited<ReturnType<typeof changeHabitCheckIn>>,
    ) => void;
    mutation.mockReturnValue(new Promise((done) => (resolve = done)));
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: "Ghi dấu Chạy bộ" }));

    expect(
      await screen.findByRole("button", { name: "Hoàn tác Chạy bộ" }),
    ).toHaveAttribute("aria-pressed", "true");
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "7 ngày qua: 2 đã làm",
    );
    expect(mutation).toHaveBeenCalledWith({ id: HABIT_ID, action: "check-in" });

    resolve({
      status: "success",
      today: { date: "2026-11-02", checkedIn: true, checkIn: null },
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("undoes a check-in made earlier today", async () => {
    mutation.mockResolvedValue({
      status: "success",
      today: { date: "2026-11-02", checkedIn: false, checkIn: null },
    });
    renderRow({
      checkedInToday: true,
      checkedInAt: "2026-11-01T23:30:00.000Z",
    });

    fireEvent.click(screen.getByRole("button", { name: "Hoàn tác Chạy bộ" }));

    await waitFor(() =>
      expect(mutation).toHaveBeenCalledWith({ id: HABIT_ID, action: "undo" }),
    );
  });

  it("puts the ring back and explains when saving fails", async () => {
    mutation.mockResolvedValue({
      status: "error",
      message: "Không thể ghi dấu lúc này.",
    });
    renderRow();

    fireEvent.click(screen.getByRole("button", { name: "Ghi dấu Chạy bộ" }));

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể ghi dấu lúc này.",
    );
    expect(
      await screen.findByRole("button", { name: "Ghi dấu Chạy bộ" }),
    ).toHaveAttribute("aria-pressed", "false");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("shows QUIT habits without a check-in ring", () => {
    renderRow({ type: "QUIT", frequencyType: null, currentStreak: 23 });

    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.getByText("Số ngày không tái phạm:")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Chạy bộ/ })).toHaveAttribute(
      "href",
      `/habits/${HABIT_ID}`,
    );
  });
});
