import { describe, expect, it } from "vitest";

import { buildMemoryHref, parseMemoryLocation } from "./memory-url";

describe("Memory URL state", () => {
  it("omits collection defaults and blank search text", () => {
    expect(
      buildMemoryHref({
        page: 1,
        search: "   ",
        state: "ACTIVE",
        sortBy: "occurredOn",
        sortOrder: "desc",
      }),
    ).toBe("/memories");
  });

  it("preserves non-default collection state", () => {
    expect(
      buildMemoryHref({
        page: 3,
        search: "  summer light  ",
        state: "TRASHED",
        sortBy: "updatedAt",
        sortOrder: "asc",
      }),
    ).toBe(
      "/memories?page=3&search=summer+light" +
        "&state=TRASHED&sortBy=updatedAt&sortOrder=asc",
    );
  });

  it("parses valid search parameters", () => {
    expect(
      parseMemoryLocation({
        page: "2",
        search: "  old garden  ",
        state: "TRASHED",
        sortBy: "createdAt",
        sortOrder: "asc",
      }),
    ).toEqual({
      page: 2,
      search: "old garden",
      state: "TRASHED",
      sortBy: "createdAt",
      sortOrder: "asc",
    });
  });

  it("falls back safely for malformed parameters", () => {
    expect(
      parseMemoryLocation({
        page: "-10",
        state: "DELETED",
        sortBy: "title",
        sortOrder: "sideways",
      }),
    ).toEqual({
      page: 1,
      search: "",
      state: undefined,
      sortBy: "occurredOn",
      sortOrder: "desc",
    });
  });

  it("uses the first value when a parameter is repeated", () => {
    expect(
      parseMemoryLocation({
        page: ["4", "9"],
        search: ["first", "second"],
      }),
    ).toEqual({
      page: 4,
      search: "first",
      state: undefined,
      sortBy: "occurredOn",
      sortOrder: "desc",
    });
  });
});
