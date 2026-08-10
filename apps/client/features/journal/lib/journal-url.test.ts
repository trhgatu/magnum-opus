import { describe, expect, it } from "vitest";

import { buildJournalHref } from "./journal-url";

describe("buildJournalHref", () => {
  it("omits defaults and blank search text", () => {
    expect(buildJournalHref({ page: 1, search: "   " })).toBe("/journal");
  });

  it("keeps the active search, state and page", () => {
    expect(
      buildJournalHref({ page: 3, search: "  inner work  ", state: "SEALED" }),
    ).toBe("/journal?page=3&search=inner+work&state=SEALED");
  });
});
