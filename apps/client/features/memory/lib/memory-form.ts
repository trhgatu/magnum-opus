import type { MemoryDatePrecision } from "@repo/contracts";

import { isValidMemoryCalendarDate } from "@/features/memory/lib/memory-date";

export interface NormalizedMemoryOccurredOn {
  occurredOn: string | null;
  occurredOnPrecision: MemoryDatePrecision;
}

const MONTH_INPUT_PATTERN = /^\d{4}-\d{2}$/;
const YEAR_INPUT_PATTERN = /^\d{4}$/;

export function normalizeMemoryOccurredOnInput(
  inputValue: string,
  precision: MemoryDatePrecision,
): NormalizedMemoryOccurredOn | undefined {
  const value = inputValue.trim();

  if (precision === "UNKNOWN") {
    return {
      occurredOn: null,
      occurredOnPrecision: "UNKNOWN",
    };
  }

  if (precision === "DAY") {
    return isValidMemoryCalendarDate(value)
      ? {
          occurredOn: value,
          occurredOnPrecision: "DAY",
        }
      : undefined;
  }

  if (precision === "MONTH") {
    if (!MONTH_INPUT_PATTERN.test(value)) {
      return undefined;
    }

    const occurredOn = `${value}-01`;

    return isValidMemoryCalendarDate(occurredOn)
      ? {
          occurredOn,
          occurredOnPrecision: "MONTH",
        }
      : undefined;
  }

  if (!YEAR_INPUT_PATTERN.test(value)) {
    return undefined;
  }

  const occurredOn = `${value}-01-01`;

  return isValidMemoryCalendarDate(occurredOn)
    ? {
        occurredOn,
        occurredOnPrecision: "YEAR",
      }
    : undefined;
}

export function memoryOccurredOnInputValue(
  occurredOn: string | null,
  precision: MemoryDatePrecision,
): string {
  if (
    precision === "UNKNOWN" ||
    !occurredOn ||
    !isValidMemoryCalendarDate(occurredOn)
  ) {
    return "";
  }

  if (precision === "MONTH") {
    return occurredOn.endsWith("-01") ? occurredOn.slice(0, 7) : "";
  }

  if (precision === "YEAR") {
    return occurredOn.endsWith("-01-01") ? occurredOn.slice(0, 4) : "";
  }

  return occurredOn;
}

export function memoryCalendarDateFromDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function memoryCalendarDateToDate(value: string): Date | undefined {
  if (!isValidMemoryCalendarDate(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);

  date.setHours(12, 0, 0, 0);
  date.setFullYear(year!, month! - 1, day);

  return date;
}
