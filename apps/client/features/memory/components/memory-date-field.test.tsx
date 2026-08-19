// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { MemoryDateField } from "./memory-date-field";

afterEach(cleanup);

describe("MemoryDateField", () => {
  it("uses a shadcn Select for date precision", () => {
    render(
      <MemoryDateField
        precision="MONTH"
        value="2024-08"
        onPrecisionChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    );

    expect(
      screen.getByRole("combobox", {
        name: "Độ chính xác của thời gian",
      }),
    ).toBeTruthy();

    expect(
      (screen.getByLabelText("Thời điểm xảy ra") as HTMLInputElement).type,
    ).toBe("month");
  });

  it("uses a numeric input for year precision", () => {
    render(
      <MemoryDateField
        precision="YEAR"
        value="2024"
        onPrecisionChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    );

    const input = screen.getByLabelText("Thời điểm xảy ra") as HTMLInputElement;

    expect(input.type).toBe("number");
    expect(input.min).toBe("1");
    expect(input.max).toBe("9999");
  });

  it("does not invent a date when precision is unknown", () => {
    render(
      <MemoryDateField
        precision="UNKNOWN"
        value=""
        onPrecisionChange={vi.fn()}
        onValueChange={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "Ký ức vẫn có thể được lưu khi thời điểm xảy ra không còn được nhớ chính xác.",
      ),
    ).toBeTruthy();

    expect(screen.queryByLabelText("Thời điểm xảy ra")).toBeNull();
  });
});
