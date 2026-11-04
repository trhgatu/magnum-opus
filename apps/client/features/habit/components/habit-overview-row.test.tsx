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
    { date: "2026-10-27", mark: "MISSED" },
    { date: "2026-10-28", mark: "DONE" },
    { date: "2026-10-29", mark: "DONE" },
    { date: "2026-10-30", mark: "DONE" },
    { date: "2026-10-31", mark: "DONE" },
    { date: "2026-11-01", mark: "DONE" },
    { date: "2026-11-02", mark: "PENDING" },
  ],
  nextDueOn: "2026-11-03",
  ...overrides,
});

const ring = () => screen.getByRole("button", { name: "Ghi dấu Chạy bộ" });

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

    expect(screen.getByRole("img").children).toHaveLength(7);
    fireEvent.click(ring());

    await waitFor(() => expect(ring()).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByRole("img")).toHaveAccessibleName(
      "7 ngày qua: 1 bỏ lỡ, 6 đã làm",
    );
    expect(screen.getByText("Chuỗi hiện tại:").parentElement).toHaveTextContent(
      "5",
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

    expect(ring()).toHaveAttribute("aria-pressed", "true");
    fireEvent.click(ring());

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

    fireEvent.click(ring());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể ghi dấu lúc này.",
    );
    await waitFor(() =>
      expect(ring()).toHaveAttribute("aria-pressed", "false"),
    );
    // Lỗi vẫn đọc lại từ server: có thể đã ghi được.
    expect(refresh).toHaveBeenCalledOnce();
  });

  it("explains when the request itself fails", async () => {
    mutation.mockRejectedValue(new TypeError("Failed to fetch"));
    renderRow();

    fireEvent.click(ring());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể ghi dấu lúc này. Thử lại sau.",
    );
    await waitFor(() =>
      expect(ring()).toHaveAttribute("aria-pressed", "false"),
    );
  });

  it("does not add a check-in on a rest day to the streak", async () => {
    mutation.mockReturnValue(new Promise(() => {}));
    renderRow({ dueToday: false });

    fireEvent.click(ring());

    await waitFor(() => expect(ring()).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByText("Chuỗi hiện tại:").parentElement).toHaveTextContent(
      "4",
    );
  });

  it("keeps keyboard focus on the ring after the row moves group", async () => {
    mutation.mockResolvedValue({
      status: "success",
      today: { date: "2026-11-02", checkedIn: true, checkIn: null },
    });
    const { unmount } = renderRow();
    ring().focus();

    fireEvent.click(ring());
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());

    // Refresh dựng lại dòng ở nhóm "Đã ghi dấu hôm nay".
    unmount();
    renderRow({ checkedInToday: true, currentStreak: 5 });

    expect(ring()).toHaveFocus();
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
