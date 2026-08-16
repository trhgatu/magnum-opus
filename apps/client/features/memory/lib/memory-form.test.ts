import { describe, expect, it } from "vitest";

import {
  memoryOccurredOnInputValue,
  normalizeMemoryOccurredOnInput,
} from "./memory-form";

describe("normalizeMemoryOccurredOnInput", () => {
  it("preserves a complete calendar day", () => {
    expect(normalizeMemoryOccurredOnInput("2024-08-14", "DAY")).toEqual({
      occurredOn: "2024-08-14",
      occurredOnPrecision: "DAY",
    });
  });

  it("normalizes a month to its first day", () => {
    expect(normalizeMemoryOccurredOnInput("2024-08", "MONTH")).toEqual({
      occurredOn: "2024-08-01",
      occurredOnPrecision: "MONTH",
    });
  });

  it("normalizes a year to its first day", () => {
    expect(normalizeMemoryOccurredOnInput("2024", "YEAR")).toEqual({
      occurredOn: "2024-01-01",
      occurredOnPrecision: "YEAR",
    });
  });

  it("represents unknown time with null", () => {
    expect(normalizeMemoryOccurredOnInput("", "UNKNOWN")).toEqual({
      occurredOn: null,
      occurredOnPrecision: "UNKNOWN",
    });
  });

  it("ignores stale input when time becomes unknown", () => {
    expect(normalizeMemoryOccurredOnInput("2024-08-14", "UNKNOWN")).toEqual({
      occurredOn: null,
      occurredOnPrecision: "UNKNOWN",
    });
  });

  it("rejects an impossible day", () => {
    expect(normalizeMemoryOccurredOnInput("2024-02-31", "DAY")).toBeUndefined();
  });

  it("rejects an impossible month", () => {
    expect(normalizeMemoryOccurredOnInput("2024-13", "MONTH")).toBeUndefined();
  });

  it("rejects year zero", () => {
    expect(normalizeMemoryOccurredOnInput("0000", "YEAR")).toBeUndefined();
  });

  it("rejects a missing known date", () => {
    expect(normalizeMemoryOccurredOnInput("", "DAY")).toBeUndefined();

    expect(normalizeMemoryOccurredOnInput("", "MONTH")).toBeUndefined();

    expect(normalizeMemoryOccurredOnInput("", "YEAR")).toBeUndefined();
  });
});

describe("memoryOccurredOnInputValue", () => {
  it("preserves a complete day", () => {
    expect(memoryOccurredOnInputValue("2024-08-14", "DAY")).toBe("2024-08-14");
  });

  it("converts a normalized month to an HTML month input", () => {
    expect(memoryOccurredOnInputValue("2024-08-01", "MONTH")).toBe("2024-08");
  });

  it("converts a normalized year to a year input", () => {
    expect(memoryOccurredOnInputValue("2024-01-01", "YEAR")).toBe("2024");
  });

  it("returns an empty input for unknown time", () => {
    expect(memoryOccurredOnInputValue(null, "UNKNOWN")).toBe("");
  });

  it("ignores a stale date when precision is unknown", () => {
    expect(memoryOccurredOnInputValue("2024-08-14", "UNKNOWN")).toBe("");
  });

  it("rejects a non-normalized month", () => {
    expect(memoryOccurredOnInputValue("2024-08-14", "MONTH")).toBe("");
  });

  it("rejects a non-normalized year", () => {
    expect(memoryOccurredOnInputValue("2024-08-01", "YEAR")).toBe("");
  });

  it("rejects an invalid persisted date", () => {
    expect(memoryOccurredOnInputValue("2024-02-31", "DAY")).toBe("");
  });
});
