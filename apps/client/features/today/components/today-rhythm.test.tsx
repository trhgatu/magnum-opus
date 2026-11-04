// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type {
  ForgeTodayResponse,
  HabitOverviewItemResponse,
} from "@repo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TodayRhythm } from "./today-rhythm";

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitCheckIn: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

afterEach(cleanup);

const item = (
  id: string,
  title: string,
  overrides: Partial<HabitOverviewItemResponse> = {},
): HabitOverviewItemResponse => ({
  id,
  title,
  description: null,
  type: "BUILD",
  frequencyType: "DAILY",
  frequencyDays: [],
  quitStartedAt: null,
  routines: [],
  dueToday: true,
  checkedInToday: false,
  checkedInAt: null,
  currentStreak: 0,
  longestStreak: 0,
  lastSevenDays: [],
  nextDueOn: null,
  ...overrides,
});

const overview = (habits: HabitOverviewItemResponse[]) => ({
  date: "2026-11-04",
  timeZone: "Asia/Ho_Chi_Minh",
  habits,
});

const today = (
  overrides: Partial<ForgeTodayResponse> = {},
): ForgeTodayResponse => ({
  date: "2026-11-04",
  timeZone: "Asia/Ho_Chi_Minh",
  emptyReason: null,
  routines: [],
  standaloneHabits: [],
  ...overrides,
});

describe("TodayRhythm", () => {
  it("lists today's habits in routine order with a done count and routine progress", () => {
    render(
      <TodayRhythm
        today={today({
          routines: [
            {
              id: "r1",
              title: "Khởi động ngày mới",
              habits: [
                { id: "a", title: "Thiền", description: null, checkedIn: true },
                {
                  id: "b",
                  title: "Đọc sách",
                  description: null,
                  checkedIn: false,
                },
              ],
            },
          ],
        })}
        overview={overview([
          item("b", "Đọc sách"),
          item("a", "Thiền", { checkedInToday: true }),
        ])}
      />,
    );

    expect(
      screen
        .getAllByRole("button")
        .map((ring) => ring.getAttribute("aria-label")),
    ).toEqual(["Ghi dấu Thiền", "Ghi dấu Đọc sách"]);
    expect(screen.getByText("1 / 2 đã ghi dấu")).toBeInTheDocument();
    expect(screen.getByText("Bước 2 / 2")).toBeInTheDocument();
    expect(screen.getByText("Tiếp theo: Đọc sách")).toBeInTheDocument();
  });

  it("offers to create a habit when there is none", () => {
    render(
      <TodayRhythm
        today={today({ emptyReason: "NO_ACTIVE_HABITS" })}
        overview={overview([])}
      />,
    );

    expect(
      screen.getByText("Chưa có thói quen nào đang rèn."),
    ).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Tạo thói quen" })).toHaveAttribute(
      "href",
      "/habits/new",
    );
  });

  it("calls a day with nothing scheduled a rest", () => {
    render(
      <TodayRhythm
        today={today({ emptyReason: "NOTHING_DUE" })}
        overview={overview([item("a", "Tập tạ", { dueToday: false })])}
      />,
    );

    expect(
      screen.getByText("Hôm nay không có lịch nào. Một ngày để thở."),
    ).toBeInTheDocument();
  });
});
