// @vitest-environment jsdom

import { cleanup, render, screen, within } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { JournalStateFilter } from "./journal-state-filter";

afterEach(cleanup);

describe("JournalStateFilter", () => {
  it("renders canonical state links from the default collection", () => {
    render(<JournalStateFilter search="" />);

    const navigation = screen.getByRole("navigation", {
      name: "Lọc Journal theo trạng thái",
    });

    expect(
      within(navigation)
        .getByRole("link", {
          name: "Đang lưu giữ",
        })
        .getAttribute("aria-current"),
    ).toBe("page");

    expect(
      within(navigation)
        .getByRole("link", {
          name: "Draft",
        })
        .getAttribute("href"),
    ).toBe("/journal?state=DRAFT");
  });

  it("preserves search while changing state", () => {
    render(<JournalStateFilter search="summer light" state="TRASHED" />);

    expect(
      screen
        .getByRole("link", {
          name: "Trash",
        })
        .getAttribute("aria-current"),
    ).toBe("page");

    expect(
      screen
        .getByRole("link", {
          name: "Sealed",
        })
        .getAttribute("href"),
    ).toBe("/journal?search=summer+light&state=SEALED");
  });
});
