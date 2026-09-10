const CALENDAR_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function quitStartedAtFromDate(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

export function quitStartedAtToDate(value: string): Date | undefined {
  if (!CALENDAR_DATE_PATTERN.test(value)) {
    return undefined;
  }

  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(0);

  date.setHours(12, 0, 0, 0);
  date.setFullYear(year!, month! - 1, day);

  return date;
}

export function formatQuitStartedAt(value: string): string {
  const date = quitStartedAtToDate(value);
  if (!date) return value;

  return new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(date);
}
