import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  formatQuitStartedAt,
  quitStartedAtFromDate,
  quitStartedAtToDate,
  todayAsLocalCalendarDate,
} from "./habit-quit";

describe("quitStartedAtFromDate / quitStartedAtToDate", () => {
  it("round-trips a well-formed calendar date", () => {
    const date = quitStartedAtToDate("2026-08-01");
    expect(date).toBeDefined();
    expect(quitStartedAtFromDate(date!)).toBe("2026-08-01");
  });

  it("rejects a malformed string", () => {
    expect(quitStartedAtToDate("not-a-date")).toBeUndefined();
  });

  it("rejects a calendar date that does not exist", () => {
    expect(quitStartedAtToDate("2026-02-30")).toBeUndefined();
    expect(quitStartedAtToDate("2026-04-31")).toBeUndefined();
  });
});

describe("formatQuitStartedAt", () => {
  it("formats a valid date in Vietnamese", () => {
    expect(formatQuitStartedAt("2026-08-01")).toContain("2026");
  });

  it("falls back to the raw value for a malformed date", () => {
    expect(formatQuitStartedAt("not-a-date")).toBe("not-a-date");
  });
});

describe("todayAsLocalCalendarDate", () => {
  const originalTimeZone = process.env.TZ;

  beforeEach(() => {
    // Node đọc lại TZ khi nó đổi: ép múi giờ dương để ngày local khác ngày UTC.
    process.env.TZ = "Asia/Ho_Chi_Minh";
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
    process.env.TZ = originalTimeZone;
  });

  // Server so với ngày của owner, nên mặc định phải là ngày người dùng đang
  // thấy, không phải ngày UTC.
  it("uses the local calendar day while UTC is still the day before", () => {
    // 2026-08-14T23:30Z là 06:30 ngày 15 ở UTC+7.
    vi.setSystemTime(new Date("2026-08-14T23:30:00.000Z"));

    expect(quitStartedAtFromDate(todayAsLocalCalendarDate())).toBe(
      "2026-08-15",
    );
  });
});
