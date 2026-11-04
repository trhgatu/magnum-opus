// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { HabitOverviewItemResponse } from "@repo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { HabitOverviewList } from "./habit-overview-list";

vi.mock("@/features/habit/actions/habit", () => ({
  changeHabitCheckIn: vi.fn(),
}));
vi.mock("next/navigation", () => ({
  useRouter: () => ({ refresh: vi.fn() }),
}));

const overview = { date: "2026-11-02", timeZone: "Asia/Ho_Chi_Minh" };

let nextId = 0;
const habit = (
  overrides: Partial<HabitOverviewItemResponse> = {},
): HabitOverviewItemResponse => ({
  id: `habit-${(nextId += 1)}`,
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
  currentStreak: 0,
  longestStreak: 0,
  lastSevenDays: [],
  nextDueOn: null,
  ...overrides,
});

afterEach(cleanup);

describe("HabitOverviewList", () => {
  it("keeps today's work open and folds what is done or not scheduled", () => {
    const { container } = render(
      <HabitOverviewList
        overview={overview}
        type="BUILD"
        habits={[
          habit({ title: "Đọc sách" }),
          habit({ title: "Thiền", checkedInToday: true }),
          habit({ title: "Tập tạ", dueToday: false }),
        ]}
      />,
    );

    expect(
      screen.getByRole("heading", { name: "Còn chờ hôm nay" }),
    ).toBeVisible();
    expect(
      screen.getByRole("button", { name: "Ghi dấu Đọc sách" }),
    ).toBeVisible();

    const folds = [...container.querySelectorAll("details")];
    expect(
      folds.map((fold) => fold.querySelector("summary")?.textContent),
    ).toEqual(["Đã ghi dấu hôm nay1", "Không có lịch hôm nay1"]);
    expect(folds.every((fold) => !fold.open)).toBe(true);
  });

  it("says so when nothing is left for today", () => {
    render(
      <HabitOverviewList
        overview={overview}
        type="BUILD"
        habits={[habit({ checkedInToday: true })]}
      />,
    );

    expect(
      screen.getByText("Hôm nay không còn việc nào chờ."),
    ).toBeInTheDocument();
    expect(
      screen.queryByRole("heading", { name: "Còn chờ hôm nay" }),
    ).toBeNull();
  });

  it("lists QUIT habits flat, without today's groups", () => {
    const { container } = render(
      <HabitOverviewList
        overview={overview}
        type="QUIT"
        habits={[
          habit({
            title: "Không hút thuốc",
            type: "QUIT",
            quitStartedAt: "2026-10-01",
          }),
          habit({
            title: "Không uống trà sữa",
            type: "QUIT",
            quitStartedAt: "2026-10-01",
          }),
        ]}
      />,
    );

    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(container.querySelector("details")).toBeNull();
    expect(screen.queryByRole("heading")).toBeNull();
  });
});
