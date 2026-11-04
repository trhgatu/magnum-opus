import type {
  ForgeTodayResponse,
  HabitOverviewItemResponse,
} from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  formatTodayLabel,
  greetingAt,
  routineProgress,
  todayGroups,
  todayHabits,
} from "./today-plan";

const item = (
  id: string,
  overrides: Partial<HabitOverviewItemResponse> = {},
): HabitOverviewItemResponse => ({
  id,
  title: id,
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

const due = (id: string, checkedIn = false) => ({
  id,
  title: id,
  description: null,
  checkedIn,
});

const today = (
  routines: ForgeTodayResponse["routines"],
  standaloneHabits: ForgeTodayResponse["standaloneHabits"] = [],
) => ({ routines, standaloneHabits });

describe("todayHabits", () => {
  it("follows the routine order, then standalone habits, once each", () => {
    const habits = todayHabits(
      today(
        [
          { id: "r1", title: "Sáng", habits: [due("b"), due("a")] },
          { id: "r2", title: "Tối", habits: [due("a"), due("c")] },
        ],
        [due("d")],
      ),
      ["a", "b", "c", "d"].map((id) => item(id)),
    );

    expect(habits.map((habit) => habit.id)).toEqual(["b", "a", "c", "d"]);
  });

  it("keeps a check-in made on a rest day", () => {
    const habits = todayHabits(today([], [due("a")]), [
      item("a"),
      item("rest", { dueToday: false, checkedInToday: true }),
      item("quit", { type: "QUIT", checkedInToday: false }),
    ]);

    expect(habits.map((habit) => habit.id)).toEqual(["a", "rest"]);
  });
});

describe("todayGroups", () => {
  it("groups by routine, shows a shared habit once, then standalone habits", () => {
    const groups = todayGroups(
      today(
        [
          { id: "r1", title: "Sáng", habits: [due("a"), due("b")] },
          { id: "r2", title: "Tối", habits: [due("b"), due("c")] },
        ],
        [due("d")],
      ),
      ["a", "b", "c", "d"].map((id) => item(id)),
    );

    expect(
      groups.map((group) => [
        group.key,
        group.routine?.total ?? null,
        group.items.map((habit) => habit.id),
      ]),
    ).toEqual([
      ["r1", 2, ["a", "b"]],
      ["r2", 2, ["c"]],
      ["standalone", null, ["d"]],
    ]);
  });
});

describe("routineProgress", () => {
  it("finds the next unchecked step from the overview", () => {
    const progress = routineProgress(
      { id: "r1", title: "Sáng", habits: [due("a"), due("b"), due("c")] },
      [item("a", { checkedInToday: true }), item("b"), item("c")],
    );

    expect(progress).toMatchObject({
      total: 3,
      done: 1,
      next: "b",
      steps: ["done", "next", "todo"],
    });
  });

  it("names the first unchecked step even when later ones are done", () => {
    const progress = routineProgress(
      { id: "r1", title: "Sáng", habits: [due("a"), due("b"), due("c")] },
      [item("a"), item("b", { checkedInToday: true }), item("c")],
    );

    expect(progress).toMatchObject({ done: 1, next: "a", nextStep: 1 });
  });

  it("is finished when every step is checked in", () => {
    const progress = routineProgress(
      { id: "r1", title: "Sáng", habits: [due("a", true)] },
      [],
    );

    expect(progress.next).toBeNull();
    expect(progress.steps).toEqual(["done"]);
  });
});

describe("greetingAt and formatTodayLabel", () => {
  it("greets by the hour in the account time zone", () => {
    // 01:30 UTC là 08:30 ở Việt Nam.
    const morning = new Date("2026-11-04T01:30:00.000Z");
    expect(greetingAt(morning, "Asia/Ho_Chi_Minh")).toBe("Chào buổi sáng.");
    expect(greetingAt(morning, "UTC")).toBe("Khuya rồi.");
    expect(
      greetingAt(new Date("2026-11-04T12:00:00.000Z"), "Asia/Ho_Chi_Minh"),
    ).toBe("Chào buổi tối.");
  });

  it("names the day", () => {
    expect(formatTodayLabel("2026-11-04")).toBe("Thứ Tư · 4 tháng 11");
  });
});
