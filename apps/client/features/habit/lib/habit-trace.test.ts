import type { HabitDayMark } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import {
  describeHabitTrace,
  describeTraceDay,
  layoutHabitTrace,
  tallyHabitTrace,
} from "./habit-trace";

/** `count` ngày liên tiếp kết thúc ở `last`, dấu lấy lần lượt từ `marks`. */
function trace(last: string, count: number, marks: HabitDayMark[] = ["DONE"]) {
  const end = Date.parse(`${last}T00:00:00.000Z`);
  return Array.from({ length: count }, (_, index) => ({
    date: new Date(end - (count - 1 - index) * 86_400_000)
      .toISOString()
      .slice(0, 10),
    mark: marks[index % marks.length]!,
  }));
}

describe("layoutHabitTrace", () => {
  it("lays 91 days ending on a Monday out as Monday-first weeks", () => {
    // 2026-11-02 là Thứ Hai; 91 ngày bắt đầu từ Thứ Ba 2026-08-04.
    const weeks = layoutHabitTrace(trace("2026-11-02", 91));

    expect(weeks).toHaveLength(14);
    expect(weeks.every((week) => week.cells.length === 7)).toBe(true);
    // Thứ Hai trước ngày đầu để trống.
    expect(weeks[0]!.cells[0]).toEqual({ kind: "before" });
    expect(weeks[0]!.cells[1]).toMatchObject({
      kind: "day",
      date: "2026-08-04",
    });
    // Tuần cuối: hôm nay ở ô Thứ Hai, sáu ô sau chưa tới.
    expect(weeks.at(-1)!.cells[0]).toMatchObject({ date: "2026-11-02" });
    expect(weeks.at(-1)!.cells.slice(1)).toEqual(
      Array(6).fill({ kind: "after" }),
    );
  });

  it("labels the first week of each month", () => {
    const labels = layoutHabitTrace(trace("2026-11-02", 91)).map(
      (week) => week.monthLabel,
    );

    expect(labels.filter(Boolean)).toEqual(["Th 8", "Th 9", "Th 10", "Th 11"]);
    expect(labels[0]).toBe("Th 8");
  });

  it("returns no weeks for an empty trace", () => {
    expect(layoutHabitTrace([])).toEqual([]);
  });
});

describe("tallyHabitTrace and describeHabitTrace", () => {
  const days = trace("2026-11-02", 7, [
    "UNTRACKED",
    "DONE",
    "REST",
    "MISSED",
    "DONE",
    "DONE",
    "PENDING",
  ]);

  it("counts done and missed days", () => {
    expect(tallyHabitTrace(days)).toEqual({ done: 3, missed: 1 });
  });

  it("words the summary for the habit type", () => {
    expect(describeHabitTrace("BUILD", days)).toBe(
      "13 tuần gần nhất: 3 buổi đã ghi dấu, 1 buổi bỏ lỡ, hôm nay chưa ghi dấu",
    );
    expect(describeHabitTrace("QUIT", days)).toBe(
      "13 tuần gần nhất: 3 ngày không tái phạm, 1 ngày tái phạm, hôm nay đang giữ",
    );
  });

  it("names a single day for its tooltip", () => {
    expect(
      describeTraceDay("BUILD", { date: "2026-10-29", mark: "MISSED" }),
    ).toBe("29/10: bỏ lỡ");
    expect(
      describeTraceDay("QUIT", { date: "2026-10-29", mark: "MISSED" }),
    ).toBe("29/10: tái phạm");
  });
});
