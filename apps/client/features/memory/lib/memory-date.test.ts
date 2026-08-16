import { describe, expect, it } from "vitest";

import {
  formatMemoryOccurredOn,
  memoryOccurredOnDateTime,
} from "./memory-date";

describe("formatMemoryOccurredOn", () => {
  it("formats a complete calendar day", () => {
    expect(formatMemoryOccurredOn("2024-08-01", "DAY")).toBe("1 tháng 8, 2024");
  });

  it("shows only month and year for month precision", () => {
    expect(formatMemoryOccurredOn("2024-08-01", "MONTH")).toBe("Tháng 8, 2024");
  });

  it("shows only the year for year precision", () => {
    expect(formatMemoryOccurredOn("2024-01-01", "YEAR")).toBe("Năm 2024");
  });

  it("does not invent a date for unknown precision", () => {
    expect(formatMemoryOccurredOn(null, "UNKNOWN")).toBe("Không rõ thời gian");
  });

  it("ignores an accidental value when precision is unknown", () => {
    expect(formatMemoryOccurredOn("2024-08-01", "UNKNOWN")).toBe(
      "Không rõ thời gian",
    );
  });

  it("falls back safely for an impossible calendar date", () => {
    expect(formatMemoryOccurredOn("2024-02-31", "DAY")).toBe(
      "Không rõ thời gian",
    );
  });

  it("falls back safely for a non-canonical date", () => {
    expect(formatMemoryOccurredOn("01/08/2024", "DAY")).toBe(
      "Không rõ thời gian",
    );
  });

  it("accepts a valid leap day", () => {
    expect(formatMemoryOccurredOn("2024-02-29", "DAY")).toBe(
      "29 tháng 2, 2024",
    );
  });
});

describe("memoryOccurredOnDateTime", () => {
  it("preserves the declared date precision", () => {
    expect(memoryOccurredOnDateTime("2024-08-01", "DAY")).toBe("2024-08-01");

    expect(memoryOccurredOnDateTime("2024-08-01", "MONTH")).toBe("2024-08");

    expect(memoryOccurredOnDateTime("2024-01-01", "YEAR")).toBe("2024");
  });

  it("does not expose an invented date", () => {
    expect(memoryOccurredOnDateTime(null, "UNKNOWN")).toBeUndefined();

    expect(memoryOccurredOnDateTime("2024-08-01", "UNKNOWN")).toBeUndefined();

    expect(memoryOccurredOnDateTime("2024-02-31", "DAY")).toBeUndefined();
  });
});
