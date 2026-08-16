// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemoryDayPicker } from "./memory-day-picker";

afterEach(cleanup);

describe("MemoryDayPicker", () => {
  it("renders the selected calendar day in Vietnamese", () => {
    render(<MemoryDayPicker value="2024-08-14" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", {
        name: /ngày 14 tháng 08 năm 2024/i,
      }),
    ).toBeTruthy();
  });

  it("prompts for a day when no valid date is selected", () => {
    render(<MemoryDayPicker value="" onChange={vi.fn()} />);

    expect(
      screen.getByRole("button", {
        name: "Chọn ngày",
      }),
    ).toBeTruthy();
  });
});
