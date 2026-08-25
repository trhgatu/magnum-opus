import { describe, expect, it } from "vitest";

import { buildHabitHref, parseHabitLocation } from "./habit-url";

describe("Habit URL state", () => {
  it("uses the canonical active view for invalid input", () => {
    expect(
      parseHabitLocation({ page: "0", status: "NOPE", sortBy: "x" }),
    ).toEqual({
      page: 1,
      search: "",
      status: "ACTIVE",
      sortBy: "updatedAt",
      sortOrder: "desc",
    });
  });

  it("parses a complete archived view", () => {
    expect(
      parseHabitLocation({
        page: "3",
        search: "  thiền ",
        status: "ARCHIVED",
        sortBy: "title",
        sortOrder: "asc",
      }),
    ).toEqual({
      page: 3,
      search: "thiền",
      status: "ARCHIVED",
      sortBy: "title",
      sortOrder: "asc",
    });
  });

  it("omits default values from canonical links", () => {
    expect(
      buildHabitHref({
        page: 1,
        status: "ACTIVE",
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    ).toBe("/habits");
  });

  it("preserves meaningful filters", () => {
    expect(
      buildHabitHref({
        page: 2,
        search: "thiền",
        status: "ARCHIVED",
        sortBy: "title",
        sortOrder: "asc",
      }),
    ).toBe(
      "/habits?page=2&search=thi%E1%BB%81n&status=ARCHIVED&sortBy=title&sortOrder=asc",
    );
  });
});
