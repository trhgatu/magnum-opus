import { describe, expect, it } from "vitest";

import { buildHabitHref, parseHabitLocation } from "./habit-url";

describe("Habit URL state", () => {
  it("uses the canonical BUILD tab for invalid input", () => {
    expect(
      parseHabitLocation({ page: "0", status: "NOPE", type: "NOPE" }),
    ).toEqual({ page: 1, search: "", status: "ACTIVE", type: "BUILD" });
  });

  it("opens the QUIT tab", () => {
    expect(parseHabitLocation({ type: "QUIT" }).type).toBe("QUIT");
    expect(buildHabitHref({ type: "QUIT" })).toBe("/habits?type=QUIT");
  });

  it("parses a complete archived view, which is not split by type", () => {
    expect(
      parseHabitLocation({
        page: "3",
        search: "  thiền ",
        status: "ARCHIVED",
        type: "QUIT",
      }),
    ).toEqual({ page: 3, search: "thiền", status: "ARCHIVED", type: "BUILD" });
  });

  it("ignores the page on the active tabs, which are not paginated", () => {
    expect(parseHabitLocation({ page: "3" }).page).toBe(1);
    expect(buildHabitHref({ page: 3, status: "ACTIVE" })).toBe("/habits");
  });

  it("omits default values from canonical links", () => {
    expect(
      buildHabitHref({ page: 1, status: "ACTIVE", type: "BUILD", search: " " }),
    ).toBe("/habits");
  });

  it("preserves meaningful filters", () => {
    expect(
      buildHabitHref({ page: 2, search: "thiền", status: "ARCHIVED" }),
    ).toBe("/habits?search=thi%E1%BB%81n&status=ARCHIVED&page=2");
    expect(buildHabitHref({ search: "thiền", type: "QUIT" })).toBe(
      "/habits?search=thi%E1%BB%81n&type=QUIT",
    );
  });
});
