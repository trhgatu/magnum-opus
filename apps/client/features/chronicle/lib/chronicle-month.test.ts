import { describe, expect, it } from "vitest";

import {
  chronicleHref,
  compareMonths,
  formatChronicleMonth,
  monthOfDay,
  parseChronicleMonth,
  shiftMonth,
} from "./chronicle-month";

describe("parseChronicleMonth", () => {
  it("accepts a valid year and month segment", () => {
    expect(parseChronicleMonth("2026", "9")).toEqual({ year: 2026, month: 9 });
    expect(parseChronicleMonth("2026", "09")).toEqual({ year: 2026, month: 9 });
  });

  it.each([
    ["2026", "0"],
    ["2026", "13"],
    ["2026", "august"],
    ["26", "9"],
    ["1969", "12"],
    ["9999", "12"],
    ["2026", "9.5"],
  ])("rejects %s/%s", (year, month) => {
    expect(parseChronicleMonth(year, month)).toBeNull();
  });
});

describe("month helpers", () => {
  it("reads the month of a calendar day", () => {
    expect(monthOfDay("2026-10-09")).toEqual({ year: 2026, month: 10 });
  });

  it("shifts across year boundaries", () => {
    expect(shiftMonth({ year: 2026, month: 1 }, -1)).toEqual({
      year: 2025,
      month: 12,
    });
    expect(shiftMonth({ year: 2026, month: 12 }, 1)).toEqual({
      year: 2027,
      month: 1,
    });
  });

  it("compares months chronologically", () => {
    expect(
      compareMonths({ year: 2026, month: 9 }, { year: 2026, month: 10 }),
    ).toBeLessThan(0);
    expect(
      compareMonths({ year: 2027, month: 1 }, { year: 2026, month: 12 }),
    ).toBeGreaterThan(0);
    expect(
      compareMonths({ year: 2026, month: 9 }, { year: 2026, month: 9 }),
    ).toBe(0);
  });

  it("builds the URL and title of a month", () => {
    expect(chronicleHref({ year: 2026, month: 9 })).toBe("/chronicle/2026/9");
    expect(formatChronicleMonth({ year: 2026, month: 9 })).toBe(
      "Tháng 9 · 2026",
    );
  });
});
