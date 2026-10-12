import { describe, expect, it } from "vitest";

import {
  calendarDateToDateOnly,
  dateOnlyToCalendarDate,
  daysOverdue,
  formatDateOnly,
  formatInstantDay,
  todayInTimeZone,
} from "./cycle-dates";

describe("todayInTimeZone", () => {
  // 18:30 UTC ngày 11 = 01:30 sáng ngày 12 ở Việt Nam (UTC+7).
  const lateEveningUtc = new Date("2026-10-11T18:30:00.000Z");

  it("returns the calendar day of the account time zone, not of UTC", () => {
    expect(todayInTimeZone("Asia/Ho_Chi_Minh", lateEveningUtc)).toBe(
      "2026-10-12",
    );
    expect(todayInTimeZone("UTC", lateEveningUtc)).toBe("2026-10-11");
  });

  it("goes back a day for a time zone behind UTC", () => {
    expect(
      todayInTimeZone(
        "America/Los_Angeles",
        new Date("2026-10-12T03:00:00.000Z"),
      ),
    ).toBe("2026-10-11");
  });

  it("falls back to UTC for a time zone the runtime does not know", () => {
    expect(todayInTimeZone("Mars/Olympus_Mons", lateEveningUtc)).toBe(
      "2026-10-11",
    );
  });
});

describe("daysOverdue", () => {
  it("counts whole days past the target end date", () => {
    expect(daysOverdue("2026-10-10", "2026-10-12")).toBe(2);
    expect(daysOverdue("2026-09-30", "2026-10-01")).toBe(1);
  });

  it("is 0 on the target day itself and before it", () => {
    expect(daysOverdue("2026-10-12", "2026-10-12")).toBe(0);
    expect(daysOverdue("2026-12-31", "2026-10-12")).toBe(0);
  });

  it("counts across a year boundary and a leap day", () => {
    expect(daysOverdue("2027-12-31", "2028-01-01")).toBe(1);
    expect(daysOverdue("2028-02-28", "2028-03-01")).toBe(2);
  });
});

describe("formatInstantDay", () => {
  it("shows the day of an instant in the account time zone", () => {
    expect(
      formatInstantDay("2026-10-11T18:30:00.000Z", "Asia/Ho_Chi_Minh"),
    ).toBe("12/10/2026");
    expect(formatInstantDay("2026-10-11T18:30:00.000Z", "UTC")).toBe(
      "11/10/2026",
    );
  });

  it("falls back to UTC for a time zone the runtime does not know", () => {
    expect(
      formatInstantDay("2026-10-11T18:30:00.000Z", "Mars/Olympus_Mons"),
    ).toBe("11/10/2026");
  });
});

describe("formatDateOnly", () => {
  it("shows a date-only value as the same calendar day everywhere", () => {
    expect(formatDateOnly("2026-10-31")).toBe("31/10/2026");
    expect(formatDateOnly("2027-01-01")).toBe("01/01/2027");
  });
});

describe("calendar date conversion", () => {
  it("round-trips a date-only value through the local calendar date", () => {
    for (const day of ["2026-10-31", "2028-02-29", "2027-01-01"]) {
      expect(calendarDateToDateOnly(dateOnlyToCalendarDate(day))).toBe(day);
    }
  });

  it("reads the local calendar day the user clicked", () => {
    expect(calendarDateToDateOnly(new Date(2026, 9, 5, 23, 59))).toBe(
      "2026-10-05",
    );
  });
});
