// @vitest-environment jsdom

import "@testing-library/jest-dom/vitest";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ChronicleMonthPicker } from "./chronicle-month-picker";

afterEach(cleanup);

const openPicker = (
  month = { year: 2026, month: 8 },
  currentMonth = { year: 2026, month: 10 },
) => {
  render(<ChronicleMonthPicker month={month} currentMonth={currentMonth} />);
  fireEvent.click(screen.getByRole("button", { name: "Chọn tháng" }));
};

describe("ChronicleMonthPicker", () => {
  it("opens on the year of the viewed month and marks that month", () => {
    openPicker();

    expect(screen.getByText("2026")).toBeInTheDocument();
    const viewed = screen.getByRole("link", { name: "Tháng 8 · 2026" });
    expect(viewed).toHaveAttribute("href", "/chronicle/2026/8");
    expect(viewed).toHaveAttribute("aria-current", "page");
    expect(
      screen.getByRole("link", { name: "Tháng 1 · 2026" }),
    ).toHaveAttribute("href", "/chronicle/2026/1");
  });

  it("locks months after the current month", () => {
    openPicker();

    expect(
      screen.getByRole("link", { name: "Tháng 10 · 2026" }),
    ).toHaveAttribute("href", "/chronicle/2026/10");

    const future = screen.getByRole("link", { name: "Tháng 11 · 2026" });
    expect(future).toHaveAttribute("aria-disabled", "true");
    expect(future).not.toHaveAttribute("href");
  });

  it("browses to an earlier year but not past the current year", () => {
    openPicker();

    expect(screen.getByRole("button", { name: "Năm 2027" })).toBeDisabled();

    fireEvent.click(screen.getByRole("button", { name: "Năm 2025" }));

    // Screen reader được báo năm mới sau khi bấm mũi tên.
    expect(screen.getByText("2025")).toHaveAttribute("aria-live", "polite");
    expect(
      screen.getByRole("link", { name: "Tháng 12 · 2025" }),
    ).toHaveAttribute("href", "/chronicle/2025/12");
    expect(screen.getByRole("button", { name: "Năm 2026" })).toBeEnabled();
  });

  it("does not browse before 1970", () => {
    openPicker({ year: 1970, month: 3 });

    expect(screen.getByRole("button", { name: "Năm 1969" })).toBeDisabled();
  });

  it("reopens on the viewed year after browsing away", () => {
    openPicker();

    fireEvent.click(screen.getByRole("button", { name: "Năm 2025" }));
    fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
    fireEvent.click(screen.getByRole("button", { name: "Chọn tháng" }));

    expect(screen.getByText("2026")).toBeInTheDocument();
  });
});
