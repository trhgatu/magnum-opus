// @vitest-environment jsdom

import { render } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { HabitSearch } from "./habit-search";

const baseLocation = {
  page: 1,
  search: "",
  status: "ACTIVE" as const,
  type: "BUILD" as const,
};

describe("HabitSearch", () => {
  it("searches the active view without extra fields", () => {
    const { container } = render(<HabitSearch location={baseLocation} />);

    expect(container.querySelectorAll('input[type="hidden"]')).toHaveLength(0);
  });

  it("stays on the QUIT tab when searching there", () => {
    const { container } = render(
      <HabitSearch location={{ ...baseLocation, type: "QUIT" }} />,
    );

    const input = container.querySelector('input[name="type"]');
    expect((input as HTMLInputElement | null)?.value).toBe("QUIT");
  });

  it("stays on the archived tab when searching there", () => {
    const { container } = render(
      <HabitSearch location={{ ...baseLocation, status: "ARCHIVED" }} />,
    );

    const input = container.querySelector('input[name="status"]');
    expect((input as HTMLInputElement | null)?.value).toBe("ARCHIVED");
  });
});
