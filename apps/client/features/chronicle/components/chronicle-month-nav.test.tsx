// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChronicleMonthNav } from "./chronicle-month-nav";

afterEach(cleanup);

describe("ChronicleMonthNav", () => {
  it("links to the previous and next month of a closed month", () => {
    render(
      <ChronicleMonthNav
        month={{ year: 2026, month: 1 }}
        isCurrentMonth={false}
      />,
    );

    expect(
      screen.getByRole("link", { name: "Tháng 12 · 2025" }),
    ).toHaveAttribute("href", "/chronicle/2025/12");
    expect(
      screen.getByRole("link", { name: "Tháng 2 · 2026" }),
    ).toHaveAttribute("href", "/chronicle/2026/2");
  });

  it("does not link past the current month", () => {
    render(
      <ChronicleMonthNav month={{ year: 2026, month: 10 }} isCurrentMonth />,
    );

    const next = screen.getByRole("link", { name: "Tháng 11 · 2026" });

    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).not.toHaveAttribute("href");
  });

  it("does not link before the first supported month", () => {
    render(
      <ChronicleMonthNav
        month={{ year: 1970, month: 1 }}
        isCurrentMonth={false}
      />,
    );

    const previous = screen.getByRole("link", { name: "Tháng 12 · 1969" });

    expect(previous).toHaveAttribute("aria-disabled", "true");
    expect(previous).not.toHaveAttribute("href");
  });
});
