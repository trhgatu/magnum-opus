import type { JournalEntryResponse, ProjectResponse } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  cycleDayNumber,
  describeDaysAgo,
  formatCodingHours,
  journalEntryToday,
  lastSevenActivityDays,
  pickFocusProject,
} from "./today-focus";

const TZ = "Asia/Ho_Chi_Minh";
// 2026-11-04 là Thứ Tư.
const TODAY = "2026-11-04";

const project = (
  id: string,
  updatedAt: string,
  hasCycle = true,
): ProjectResponse => ({
  id,
  title: id,
  description: null,
  lifecycleState: "ACTIVE",
  currentCycle: hasCycle
    ? {
        id: `${id}-c`,
        cycleNumber: 1,
        intendedOutcome: null,
        outcomeHistory: [],
        targetEndAt: null,
        closingNote: null,
        startedAt: "2026-10-31T02:00:00.000Z",
        endedAt: null,
        endReason: null,
      }
    : null,
  revision: 1,
  createdAt: updatedAt,
  updatedAt,
});

describe("pickFocusProject", () => {
  it("takes the most recently touched project with an open cycle", () => {
    expect(
      pickFocusProject([
        project("old", "2026-11-01T00:00:00.000Z"),
        project("new", "2026-11-03T00:00:00.000Z"),
        project("no-cycle", "2026-11-04T00:00:00.000Z", false),
      ])?.id,
    ).toBe("new");
    expect(pickFocusProject([])).toBeNull();
  });
});

describe("cycleDayNumber", () => {
  it("counts the start day as day 1 in the account time zone", () => {
    // 02:00 UTC ngày 31/10 là 09:00 ngày 31/10 ở Việt Nam.
    expect(cycleDayNumber("2026-10-31T02:00:00.000Z", TODAY, TZ)).toBe(5);
    // 20:00 UTC ngày 30/10 đã là ngày 31/10 ở Việt Nam.
    expect(cycleDayNumber("2026-10-30T20:00:00.000Z", TODAY, TZ)).toBe(5);
  });
});

describe("lastSevenActivityDays", () => {
  it("returns the week up to today and marks days before the cycle", () => {
    const week = lastSevenActivityDays(
      [
        { date: "2026-11-02", state: "ACTIVE", codingSeconds: 3600 },
        { date: "2026-11-03", state: "IDLE", codingSeconds: 0 },
        { date: TODAY, state: "NO_DATA", codingSeconds: null },
      ],
      TODAY,
    );

    expect(week.map((day) => day.weekday)).toEqual([
      "T5",
      "T6",
      "T7",
      "CN",
      "T2",
      "T3",
      "T4",
    ]);
    expect(week.map((day) => day.state)).toEqual([
      "OUTSIDE",
      "OUTSIDE",
      "OUTSIDE",
      "OUTSIDE",
      "ACTIVE",
      "IDLE",
      "NO_DATA",
    ]);
  });
});

describe("formatCodingHours", () => {
  it("writes hours the Vietnamese way", () => {
    expect(formatCodingHours(23_040)).toBe("6,4");
    expect(formatCodingHours(7_200)).toBe("2");
  });
});

describe("journalEntryToday", () => {
  const entry = (
    createdAt: string,
    state: JournalEntryResponse["state"] = "DRAFT",
  ): JournalEntryResponse => ({
    id: "e1",
    title: null,
    content: "",
    state,
    stateBeforeTrash: null,
    revision: 1,
    trashedAt: null,
    createdAt,
    updatedAt: createdAt,
  });

  it("finds a page written today in the account time zone", () => {
    // 18:00 UTC ngày 3/11 là 01:00 ngày 4/11 ở Việt Nam.
    expect(
      journalEntryToday(entry("2026-11-03T18:00:00.000Z"), TODAY, TZ),
    ).not.toBeNull();
    expect(
      journalEntryToday(entry("2026-11-03T10:00:00.000Z"), TODAY, TZ),
    ).toBeNull();
    expect(
      journalEntryToday(
        entry("2026-11-04T01:00:00.000Z", "TRASHED"),
        TODAY,
        TZ,
      ),
    ).toBeNull();
    expect(journalEntryToday(undefined, TODAY, TZ)).toBeNull();
  });
});

describe("describeDaysAgo", () => {
  it("speaks in days, weeks and months", () => {
    expect(describeDaysAgo("2026-11-04T01:00:00.000Z", TODAY, TZ)).toBe(
      "hôm nay",
    );
    expect(describeDaysAgo("2026-11-03T01:00:00.000Z", TODAY, TZ)).toBe(
      "hôm qua",
    );
    expect(describeDaysAgo("2026-11-01T01:00:00.000Z", TODAY, TZ)).toBe(
      "3 ngày trước",
    );
    expect(describeDaysAgo("2026-10-14T01:00:00.000Z", TODAY, TZ)).toBe(
      "3 tuần trước",
    );
    expect(describeDaysAgo("2026-08-01T01:00:00.000Z", TODAY, TZ)).toBe(
      "3 tháng trước",
    );
  });
});
