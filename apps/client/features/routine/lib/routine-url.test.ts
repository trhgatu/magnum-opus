import { describe, expect, it } from "vitest";

import { buildRoutineHref, parseRoutineLocation } from "./routine-url";

describe("Routine URL state", () => {
  it("uses the canonical active view for invalid input", () => {
    expect(
      parseRoutineLocation({
        page: "0",
        status: "NOPE",
        sortBy: "unknown",
        sortOrder: "sideways",
      }),
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
      parseRoutineLocation({
        page: "3",
        search: "  buổi sáng  ",
        status: "ARCHIVED",
        sortBy: "title",
        sortOrder: "asc",
      }),
    ).toEqual({
      page: 3,
      search: "buổi sáng",
      status: "ARCHIVED",
      sortBy: "title",
      sortOrder: "asc",
    });
  });

  it("omits default values from canonical links", () => {
    expect(
      buildRoutineHref({
        page: 1,
        status: "ACTIVE",
        sortBy: "updatedAt",
        sortOrder: "desc",
      }),
    ).toBe("/routines");
  });

  it("preserves meaningful filters", () => {
    expect(
      buildRoutineHref({
        page: 2,
        search: "buổi sáng",
        status: "ARCHIVED",
        sortBy: "title",
        sortOrder: "asc",
      }),
    ).toBe(
      "/routines?page=2&search=bu%E1%BB%95i+s%C3%A1ng" +
        "&status=ARCHIVED&sortBy=title&sortOrder=asc",
    );
  });
});
