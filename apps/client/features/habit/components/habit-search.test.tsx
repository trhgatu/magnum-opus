// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HabitSearch } from "./habit-search";

const baseLocation = {
  page: 1,
  search: "",
  status: "ACTIVE" as const,
  type: "ALL" as const,
  sortBy: "updatedAt" as const,
  sortOrder: "desc" as const,
};

describe("HabitSearch", () => {
  it("does not render a hidden type input for the default ALL filter", () => {
    const { container } = render(<HabitSearch location={baseLocation} />);

    expect(container.querySelector('input[name="type"]')).toBeNull();
  });

  it("preserves a non-default type filter as a hidden input", () => {
    const { container } = render(
      <HabitSearch location={{ ...baseLocation, type: "QUIT" }} />,
    );

    const input = container.querySelector('input[name="type"]');
    expect(input).not.toBeNull();
    expect((input as HTMLInputElement).value).toBe("QUIT");
  });
});
