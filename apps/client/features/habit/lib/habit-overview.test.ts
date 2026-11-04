import type { HabitDayMark, HabitOverviewItemResponse } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  describeHabitOverview,
  describeLastSevenDays,
  filterHabitOverview,
  formatNextDue,
  groupHabitOverview,
} from "./habit-overview";

// 2026-11-02 là Thứ Hai.
const TODAY = "2026-11-02";
const context = { today: TODAY, timeZone: "Asia/Ho_Chi_Minh" };

const habit = (
  overrides: Partial<HabitOverviewItemResponse> = {},
): HabitOverviewItemResponse => ({
  id: "habit-1",
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
  nextDueOn: "2026-11-03",
  ...overrides,
});

describe("groupHabitOverview", () => {
  it("splits by what today asks and drops empty groups", () => {
    const groups = groupHabitOverview([
      habit({ id: "pending" }),
      habit({ id: "done", checkedInToday: true }),
      habit({ id: "rest-done", dueToday: false, checkedInToday: true }),
      habit({ id: "rest", dueToday: false }),
    ]);

    expect(
      groups.map((group) => [group.key, group.items.map((item) => item.id)]),
    ).toEqual([
      ["pending", ["pending"]],
      ["done", ["done", "rest-done"]],
      ["rest", ["rest"]],
    ]);
  });

  it("leaves QUIT habits to their own tab", () => {
    const groups = groupHabitOverview([
      habit({ id: "build" }),
      habit({ id: "quit", type: "QUIT", dueToday: true }),
    ]);

    expect(
      groups.flatMap((group) => group.items.map((item) => item.id)),
    ).toEqual(["build"]);
  });
});

describe("filterHabitOverview", () => {
  it("matches titles regardless of case", () => {
    const habits = [
      habit({ title: "Thiền 10 phút" }),
      habit({ title: "Đọc sách" }),
    ];

    expect(filterHabitOverview(habits, "  THIỀN ").map((h) => h.title)).toEqual(
      ["Thiền 10 phút"],
    );
    expect(filterHabitOverview(habits, "")).toHaveLength(2);
  });
});

describe("formatNextDue", () => {
  it("says tomorrow for the next day and the weekday otherwise", () => {
    expect(formatNextDue("2026-11-03", TODAY)).toBe("ngày mai");
    expect(formatNextDue("2026-11-04", TODAY)).toBe("thứ Tư");
    expect(formatNextDue("2026-11-08", TODAY)).toBe("chủ nhật");
  });
});

describe("describeHabitOverview", () => {
  it("shows the check-in time in the account time zone", () => {
    expect(
      describeHabitOverview(
        habit({
          checkedInToday: true,
          checkedInAt: "2026-11-01T23:30:00.000Z",
        }),
        context,
      ),
    ).toBe("Mỗi ngày · lúc 06:30");
  });

  it("shows the next session on a rest day and the routines it belongs to", () => {
    expect(
      describeHabitOverview(
        habit({
          frequencyType: "WEEKLY",
          frequencyDays: [3, 5],
          dueToday: false,
          nextDueOn: "2026-11-04",
          routines: [{ id: "r1", title: "Khởi động ngày mới" }],
        }),
        context,
      ),
    ).toBe("T4 · T6 · lần tới thứ Tư · thuộc Khởi động ngày mới");
  });

  it("shows when a QUIT habit started", () => {
    expect(
      describeHabitOverview(
        habit({
          type: "QUIT",
          frequencyType: null,
          quitStartedAt: "2026-10-10",
          nextDueOn: null,
        }),
        context,
      ),
    ).toBe("Tính từ 10 thg 10, 2026");
  });
});

describe("describeLastSevenDays", () => {
  const week = (...marks: HabitDayMark[]) =>
    marks.map((mark, index) => ({ date: `2026-10-2${7 + index}`, mark }));

  it("counts every mark of a BUILD week", () => {
    expect(
      describeLastSevenDays({
        type: "BUILD",
        lastSevenDays: week(
          "UNTRACKED",
          "DONE",
          "REST",
          "DONE",
          "MISSED",
          "REST",
          "PENDING",
        ),
      }),
    ).toBe(
      "7 ngày qua: 1 chưa theo dõi, 2 đã làm, 2 nghỉ, 1 bỏ lỡ, 1 chưa làm",
    );
  });

  it("uses relapse words for a QUIT week", () => {
    expect(
      describeLastSevenDays({
        type: "QUIT",
        lastSevenDays: week(
          "UNTRACKED",
          "DONE",
          "DONE",
          "MISSED",
          "DONE",
          "DONE",
          "PENDING",
        ),
      }),
    ).toBe(
      "7 ngày qua: 1 chưa theo dõi, 4 không tái phạm, 1 tái phạm, 1 đang giữ",
    );
  });
});
