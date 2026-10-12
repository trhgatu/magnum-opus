const DAY_MS = 24 * 60 * 60 * 1000;

const DAY_FORMAT: Intl.DateTimeFormatOptions = {
  day: "2-digit",
  month: "2-digit",
  year: "numeric",
};

export function todayInTimeZone(timeZone: string, now = new Date()): string {
  try {
    return formatDay(now, timeZone);
  } catch {
    return formatDay(now, "UTC");
  }
}

function formatDay(at: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(at);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((item) => item.type === type)?.value;

  return `${part("year")}-${part("month")}-${part("day")}`;
}

export function daysOverdue(targetEndAt: string, today: string): number {
  const diff =
    Date.parse(`${today}T00:00:00.000Z`) -
    Date.parse(`${targetEndAt}T00:00:00.000Z`);

  return diff > 0 ? Math.round(diff / DAY_MS) : 0;
}

/** Ngày (dd/mm/yyyy) của một thời điểm, theo múi giờ của tài khoản. */
export function formatInstantDay(iso: string, timeZone: string): string {
  const at = new Date(iso);

  try {
    return new Intl.DateTimeFormat("vi-VN", { ...DAY_FORMAT, timeZone }).format(
      at,
    );
  } catch {
    return new Intl.DateTimeFormat("vi-VN", {
      ...DAY_FORMAT,
      timeZone: "UTC",
    }).format(at);
  }
}

/** Ngày thuần (YYYY-MM-DD) → dd/mm/yyyy, cùng một ngày ở mọi múi giờ. */
export function formatDateOnly(day: string): string {
  return formatInstantDay(`${day}T00:00:00.000Z`, "UTC");
}

/** Ngày thuần → `Date` local lúc 12:00 cho ô lịch (react-day-picker làm việc
 * với giờ local); giữa trưa để không lệch ngày quanh giờ chuyển mùa. */
export function dateOnlyToCalendarDate(day: string): Date {
  const [year, month, date] = day.split("-").map(Number);
  // Không dùng `new Date(year, ...)`: constructor đổi năm 0–99 thành
  // 1900–1999. setFullYear giữ đúng năm.
  const calendarDate = new Date(0);

  calendarDate.setFullYear(year, month - 1, date);
  calendarDate.setHours(12, 0, 0, 0);

  return calendarDate;
}

/** Ngày người dùng bấm trên ô lịch (giờ local) → ngày thuần YYYY-MM-DD. */
export function calendarDateToDateOnly(date: Date): string {
  const year = String(date.getFullYear()).padStart(4, "0");
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}
