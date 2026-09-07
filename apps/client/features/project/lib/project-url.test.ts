import { describe, expect, it } from "vitest";

import { buildProjectHref, parseProjectLocation } from "./project-url";

describe("Project URL state", () => {
  it("falls back to page 1 and no state filter for invalid input", () => {
    expect(
      parseProjectLocation({
        page: "0",
        state: "NOPE",
      }),
    ).toEqual({
      page: 1,
      search: "",
      state: undefined,
    });
  });

  it("parses a complete filtered view", () => {
    expect(
      parseProjectLocation({
        page: "3",
        search: "  xây dựng crucible  ",
        state: "ACTIVE",
      }),
    ).toEqual({
      page: 3,
      search: "xây dựng crucible",
      state: "ACTIVE",
    });
  });

  it("omits default values from canonical links", () => {
    expect(
      buildProjectHref({
        page: 1,
      }),
    ).toBe("/projects");
  });

  it("preserves meaningful filters", () => {
    expect(
      buildProjectHref({
        page: 2,
        search: "xây dựng crucible",
        state: "ACTIVE",
      }),
    ).toBe(
      "/projects?page=2&search=x%C3%A2y+d%E1%BB%B1ng+crucible&state=ACTIVE",
    );
  });
});
