// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import type { HabitOverviewItemResponse } from "@repo/contracts";
import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TodayHolding } from "./today-holding";

afterEach(cleanup);

const habit = (
  overrides: Partial<HabitOverviewItemResponse>,
): HabitOverviewItemResponse => ({
  id: "q1",
  title: "Không hút thuốc",
  description: null,
  type: "QUIT",
  frequencyType: null,
  frequencyDays: [],
  quitStartedAt: "2026-10-01",
  routines: [],
  dueToday: false,
  checkedInToday: false,
  checkedInAt: null,
  currentStreak: 12,
  longestStreak: null,
  lastSevenDays: [{ date: "2026-11-04", mark: "PENDING" }],
  nextDueOn: null,
  ...overrides,
});

describe("TodayHolding", () => {
  it("shows each quit habit with its days and links to it", () => {
    render(<TodayHolding habits={[habit({})]} />);

    expect(
      screen.getByRole("link", {
        name: "Không hút thuốc: 12 ngày không tái phạm",
      }),
    ).toHaveAttribute("href", "/habits/q1");
    // Con số người dùng nhìn thấy trên chip.
    expect(screen.getByText("12")).toBeInTheDocument();
  });

  it("says the count starts again after a relapse today", () => {
    render(
      <TodayHolding
        habits={[
          habit({
            currentStreak: 0,
            lastSevenDays: [{ date: "2026-11-04", mark: "MISSED" }],
          }),
        ]}
      />,
    );

    expect(
      screen.getByRole("link", {
        name: "Không hút thuốc: bắt đầu lại hôm nay",
      }),
    ).toBeInTheDocument();
    expect(screen.getByText("Bắt đầu lại hôm nay")).toBeInTheDocument();
  });

  it("keeps the three most fragile habits and links to the rest", () => {
    render(
      <TodayHolding
        habits={[
          habit({ id: "a", title: "A", currentStreak: 40 }),
          habit({ id: "b", title: "B", currentStreak: 2 }),
          habit({ id: "c", title: "C", currentStreak: 9 }),
          habit({ id: "d", title: "D", currentStreak: 15 }),
          habit({
            id: "e",
            title: "E",
            currentStreak: 0,
            lastSevenDays: [{ date: "2026-11-04", mark: "MISSED" }],
          }),
        ]}
      />,
    );

    const links = screen.getAllByRole("link");
    expect(links.map((link) => link.getAttribute("href"))).toEqual([
      "/habits/e",
      "/habits/b",
      "/habits/c",
      "/habits?type=QUIT",
    ]);
    expect(
      screen.getByRole("link", { name: "+2 khác thói quen từ bỏ" }),
    ).toHaveAttribute("href", "/habits?type=QUIT");
  });

  it("renders nothing without quit habits", () => {
    const { container } = render(
      <TodayHolding habits={[habit({ type: "BUILD" })]} />,
    );

    expect(container).toBeEmptyDOMElement();
  });
});
