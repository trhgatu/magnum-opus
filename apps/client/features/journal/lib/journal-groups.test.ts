import type { JournalEntryListItemResponse } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import { groupJournalByMonth } from "./journal-groups";

const entry = (
  id: string,
  createdAt: string,
): JournalEntryListItemResponse => ({
  id,
  title: id,
  content: id,
  state: "SEALED",
  stateBeforeTrash: null,
  revision: 1,
  trashedAt: null,
  createdAt,
  updatedAt: createdAt,
  mood: null,
  memoryCount: 0,
});

describe("groupJournalByMonth", () => {
  it("groups pages by the month they were written in the owner's time zone", () => {
    const months = groupJournalByMonth(
      [
        // 18:00Z ngày 31/10 đã là sáng 01/11 ở Việt Nam.
        entry("a", "2026-10-31T18:00:00.000Z"),
        entry("b", "2026-10-31T03:00:00.000Z"),
        entry("c", "2026-10-29T03:00:00.000Z"),
      ],
      "Asia/Ho_Chi_Minh",
    );

    expect(
      months.map((month) => [
        month.label,
        month.days.map(({ entry, day, weekday }) => [entry.id, day, weekday]),
      ]),
    ).toEqual([
      ["Tháng 11, 2026", [["a", "01", "CN"]]],
      [
        "Tháng 10, 2026",
        [
          ["b", "31", "T7"],
          ["c", "29", "T5"],
        ],
      ],
    ]);
  });
});
