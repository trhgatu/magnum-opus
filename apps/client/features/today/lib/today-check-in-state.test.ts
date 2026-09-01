import type { ForgeTodayResponse } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  createTodayCheckInState,
  updateTodayCheckInState,
} from "./today-check-in-state";

describe("Today check-in state", () => {
  it("normalizes duplicate Habit appearances by Habit ID", () => {
    const today = createToday();

    const state = createTodayCheckInState(today);

    expect(state).toEqual({
      "habit-shared": true,
      "habit-standalone": false,
    });
  });

  it("updates one shared Habit immutably", () => {
    const state = {
      "habit-shared": false,
      "habit-standalone": false,
    };

    const updated = updateTodayCheckInState(state, "habit-shared", true);

    expect(updated).toEqual({
      "habit-shared": true,
      "habit-standalone": false,
    });

    expect(updated).not.toBe(state);

    expect(state).toEqual({
      "habit-shared": false,
      "habit-standalone": false,
    });
  });

  it("preserves state when the value is unchanged", () => {
    const state = {
      "habit-shared": true,
    };

    const result = updateTodayCheckInState(state, "habit-shared", true);

    expect(result).toBe(state);
  });

  it("ignores an unknown Habit ID", () => {
    const state = {
      "habit-known": false,
    };

    const result = updateTodayCheckInState(state, "habit-unknown", true);

    expect(result).toBe(state);
    expect(result).toEqual({
      "habit-known": false,
    });
  });
});

function createToday(): ForgeTodayResponse {
  const sharedHabit = {
    id: "habit-shared",
    title: "Drink water",
    description: null,
    checkedIn: true,
  };

  return {
    date: "2026-08-31",
    timeZone: "Asia/Bangkok",
    emptyReason: null,
    routines: [
      {
        id: "routine-morning",
        title: "Morning",
        habits: [sharedHabit],
      },
      {
        id: "routine-health",
        title: "Health",
        habits: [sharedHabit],
      },
    ],
    standaloneHabits: [
      {
        id: "habit-standalone",
        title: "Journal",
        description: null,
        checkedIn: false,
      },
    ],
  };
}
