import type { MemoryResponse } from "@repo/contracts";
import { describe, expect, it } from "vitest";

import { groupMemoriesByYear } from "./memory-groups";

const memory = (
  id: string,
  occurredOn: string | null,
  occurredOnPrecision: MemoryResponse["occurredOnPrecision"] = "DAY",
): MemoryResponse => ({
  id,
  title: id,
  content: id,
  occurredOn,
  occurredOnPrecision,
  sourceJournalEntryId: null,
  state: "ACTIVE",
  revision: 1,
  trashedAt: null,
  createdAt: "2026-11-25T00:00:00.000Z",
  updatedAt: "2026-11-25T00:00:00.000Z",
});

describe("groupMemoriesByYear", () => {
  it("groups by year in server order, undated memories under their own label", () => {
    const groups = groupMemoriesByYear(
      [
        memory("a", "2026-10-31"),
        memory("b", "2026-08-01", "MONTH"),
        memory("c", "2024-08-01", "MONTH"),
        memory("d", null, "UNKNOWN"),
      ],
      "occurredOn",
    );

    expect(
      groups.map((group) => [group.label, group.memories.map((m) => m.id)]),
    ).toEqual([
      ["2026", ["a", "b"]],
      ["2024", ["c"]],
      ["Chưa rõ ngày", ["d"]],
    ]);
  });

  it("keeps one unlabelled group when not sorted by when memories happened", () => {
    const memories = [memory("a", "2024-01-01"), memory("b", "2026-01-01")];

    expect(groupMemoriesByYear(memories, "updatedAt")).toEqual([
      { label: null, memories },
    ]);
  });
});
