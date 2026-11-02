import { describe, expect, it } from "vitest";

import { buildHabitHref, parseHabitLocation } from "./habit-url";

describe("Habit URL state", () => {
  it("uses the canonical active view for invalid input", () => {
    expect(parseHabitLocation({ page: "0", status: "NOPE" })).toEqual({
      page: 1,
      search: "",
      status: "ACTIVE",
    });
  });

  it("parses a complete archived view", () => {
    expect(
      parseHabitLocation({ page: "3", search: "  thiền ", status: "ARCHIVED" }),
    ).toEqual({ page: 3, search: "thiền", status: "ARCHIVED" });
  });

  it("ignores the page on the active view, which is not paginated", () => {
    expect(parseHabitLocation({ page: "3" }).page).toBe(1);
    expect(buildHabitHref({ page: 3, status: "ACTIVE" })).toBe("/habits");
  });

  it("omits default values from canonical links", () => {
    expect(buildHabitHref({ page: 1, status: "ACTIVE", search: " " })).toBe(
      "/habits",
    );
  });

  it("preserves meaningful filters", () => {
    expect(
      buildHabitHref({ page: 2, search: "thiền", status: "ARCHIVED" }),
    ).toBe("/habits?search=thi%E1%BB%81n&status=ARCHIVED&page=2");
  });
});
