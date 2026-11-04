import { describe, expect, it } from "vitest";

import {
  formatHabitFrequency,
  normalizeFrequencyDays,
} from "./habit-frequency";

describe("Habit frequency", () => {
  it("removes days from a daily schedule", () => {
    expect(normalizeFrequencyDays("DAILY", [1, 2])).toEqual([]);
  });

  it("deduplicates, validates and sorts weekly days", () => {
    expect(normalizeFrequencyDays("WEEKLY", [7, 1, 7, 0, 3.5])).toEqual([1, 7]);
  });

  it("formats a weekly schedule", () => {
    expect(formatHabitFrequency("WEEKLY", [1, 3, 5])).toBe("T2 · T4 · T6");
  });
});
