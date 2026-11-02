// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type {
  HabitOverviewItemEnvelope,
  HabitOverviewItemResponse,
} from "@repo/contracts";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { changeHabitCheckIn } from "@/features/habit/actions/habit";
import { HabitStreakPanel } from "./habit-streak-panel";

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitCheckIn: vi.fn(),
  logHabitRelapse: vi.fn(),
}));

const refresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh }),
}));

let isActive = true;
vi.mock("@/features/habit/components/habit-edit-sheet", () => ({
  useEditedHabit: () => ({ isActive }),
}));

const mutation = vi.mocked(changeHabitCheckIn);
const HABIT_ID = "550e8400-e29b-41d4-a716-446655440000";
// 2026-11-02 là Thứ Hai.
const TODAY = "2026-11-02";

const overview = (
  overrides: Partial<HabitOverviewItemResponse> = {},
): HabitOverviewItemEnvelope => ({
  date: TODAY,
  timeZone: "Asia/Ho_Chi_Minh",
  habit: {
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
    longestStreak: 9,
    lastSevenDays: [],
    nextDueOn: "2026-11-03",
    ...overrides,
  },
  trace: [
    { date: "2026-10-30", mark: "MISSED" },
    { date: "2026-10-31", mark: "DONE" },
    { date: "2026-11-01", mark: "DONE" },
    { date: TODAY, mark: "PENDING" },
  ],
});

const ring = () => screen.getByRole("button", { name: "Ghi dấu hôm nay" });

describe("HabitStreakPanel", () => {
  beforeEach(() => {
    mutation.mockReset();
    refresh.mockReset();
    isActive = true;
  });
  afterEach(cleanup);

  it("shows the streak, the longest one and 13 weeks of sessions", () => {
    render(<HabitStreakPanel overview={overview()} />);

    expect(screen.getByText("4")).toBeInTheDocument();
    expect(screen.getByText("buổi liên tiếp đúng lịch")).toBeInTheDocument();
    expect(screen.getByText(/Chuỗi dài nhất/)).toHaveTextContent(
      "Chuỗi dài nhất 9 buổi",
    );
    expect(screen.getByText(/trong 13 tuần/)).toHaveTextContent(
      "2 buổi đã ghi dấu, 1 buổi bỏ lỡ trong 13 tuần",
    );
    expect(screen.getByText(/^Hôm nay ·/)).toHaveTextContent(
      "Hôm nay · Thứ Hai, 2 tháng 11",
    );
    expect(screen.getByText("Hôm nay có lịch.")).toBeInTheDocument();
  });

  it("checks in right away and counts today in the streak", async () => {
    // Giữ request treo để thấy trạng thái lạc quan; cuối test mới trả về,
    // vì một action async chưa xong sẽ giữ mọi transition khác đang chờ.
    let resolve!: (
      value: Awaited<ReturnType<typeof changeHabitCheckIn>>,
    ) => void;
    mutation.mockReturnValue(new Promise((done) => (resolve = done)));
    render(<HabitStreakPanel overview={overview()} />);

    fireEvent.click(ring());

    await waitFor(() => expect(ring()).toHaveAttribute("aria-pressed", "true"));
    expect(screen.getByText("5")).toBeInTheDocument();
    expect(screen.getByText("Đã ghi dấu hôm nay.")).toBeInTheDocument();
    expect(mutation).toHaveBeenCalledWith({ id: HABIT_ID, action: "check-in" });

    resolve({
      status: "success",
      today: { date: TODAY, checkedIn: true, checkIn: null },
    });
    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
  });

  it("refreshes after saving and shows when today was checked in", async () => {
    mutation.mockResolvedValue({
      status: "success",
      today: { date: TODAY, checkedIn: false, checkIn: null },
    });
    render(
      <HabitStreakPanel
        overview={overview({
          checkedInToday: true,
          checkedInAt: "2026-11-01T23:30:00.000Z",
          currentStreak: 5,
        })}
      />,
    );

    expect(screen.getByText("Đã ghi dấu lúc 06:30.")).toBeInTheDocument();
    fireEvent.click(ring());

    await waitFor(() => expect(refresh).toHaveBeenCalledOnce());
    expect(mutation).toHaveBeenCalledWith({ id: HABIT_ID, action: "undo" });
  });

  it("puts the check-in back and explains when saving fails", async () => {
    mutation.mockRejectedValue(new TypeError("Failed to fetch"));
    render(<HabitStreakPanel overview={overview()} />);

    fireEvent.click(ring());

    expect(await screen.findByRole("alert")).toHaveTextContent(
      "Không thể ghi dấu lúc này. Thử lại sau.",
    );
    await waitFor(() =>
      expect(ring()).toHaveAttribute("aria-pressed", "false"),
    );
    expect(screen.getByText("4")).toBeInTheDocument();
  });

  it("names the next session on a rest day", () => {
    render(
      <HabitStreakPanel
        overview={overview({ dueToday: false, nextDueOn: "2026-11-04" })}
      />,
    );

    expect(
      screen.getByText("Hôm nay nghỉ, buổi tới thứ Tư."),
    ).toBeInTheDocument();
  });

  it("cannot check in an archived habit", () => {
    isActive = false;
    render(<HabitStreakPanel overview={overview()} />);

    expect(ring()).toBeDisabled();
  });

  it("shows days without relapse and the relapse button for a QUIT habit", () => {
    render(
      <HabitStreakPanel
        overview={overview({
          type: "QUIT",
          frequencyType: null,
          quitStartedAt: "2026-10-10",
          currentStreak: 23,
          longestStreak: null,
          dueToday: false,
          nextDueOn: null,
        })}
      />,
    );

    expect(screen.getByText("23")).toBeInTheDocument();
    expect(screen.getByText("ngày không tái phạm")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: "Tôi đã tái phạm" }),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("button", { name: "Ghi dấu hôm nay" }),
    ).toBeNull();
  });
});
