import type { MemoryDatePrecision } from "@repo/contracts";

const UNKNOWN_DATE_LABEL = "Không rõ thời gian";

interface CalendarDate {
  year: number;
  month: number;
  day: number;
}

function parseCalendarDate(value: string): CalendarDate | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);

  if (!match) {
    return null;
  }

  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);

  const date = new Date(Date.UTC(year, month - 1, day));

  const isValid =
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day;

  return isValid ? { year, month, day } : null;
}

export function isValidMemoryCalendarDate(value: string): boolean {
  return parseCalendarDate(value) !== null;
}

export function formatMemoryOccurredOn(
  value: string | null,
  precision: MemoryDatePrecision,
): string {
  if (precision === "UNKNOWN" || !value) {
    return UNKNOWN_DATE_LABEL;
  }

  const date = parseCalendarDate(value);

  if (!date) {
    return UNKNOWN_DATE_LABEL;
  }

  if (precision === "YEAR") {
    return `Năm ${date.year}`;
  }

  if (precision === "MONTH") {
    return `Tháng ${date.month}, ${date.year}`;
  }

  return `${date.day} tháng ${date.month}, ${date.year}`;
}

export function memoryOccurredOnDateTime(
  value: string | null,
  precision: MemoryDatePrecision,
): string | undefined {
  if (precision === "UNKNOWN" || !value) {
    return undefined;
  }

  const date = parseCalendarDate(value);

  if (!date) {
    return undefined;
  }

  if (precision === "YEAR") {
    return String(date.year);
  }

  const month = String(date.month).padStart(2, "0");

  if (precision === "MONTH") {
    return `${date.year}-${month}`;
  }

  const day = String(date.day).padStart(2, "0");

  return `${date.year}-${month}-${day}`;
}
