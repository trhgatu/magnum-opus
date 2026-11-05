import type {
  ActivityDay,
  ActivityDayState,
  JournalEntryResponse,
} from "@repo/contracts";

const DAY_MS = 86_400_000;

export function calendarDayIn(instant: string | Date, timeZone: string) {
  return new Intl.DateTimeFormat("en-CA", { timeZone }).format(
    new Date(instant),
  );
}

/** Ngày thứ mấy của Cycle (ngày bắt đầu là ngày 1), theo múi giờ tài khoản. */
export function cycleDayNumber(
  startedAt: string,
  today: string,
  timeZone: string,
): number {
  const start = calendarDayIn(startedAt, timeZone);
  return (
    Math.round(
      (Date.parse(`${today}T00:00:00.000Z`) -
        Date.parse(`${start}T00:00:00.000Z`)) /
        DAY_MS,
    ) + 1
  );
}

export type WeekCell = {
  date: string;
  /** "T2" … "CN" */
  weekday: string;
  state: ActivityDayState | "OUTSIDE";
};

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

/** 7 ngày tới hôm nay; ngày nằm ngoài Cycle (trước khi bắt đầu) là OUTSIDE. */
export function lastSevenActivityDays(
  days: readonly ActivityDay[],
  today: string,
): WeekCell[] {
  const byDate = new Map(days.map((day) => [day.date, day.state]));
  const end = Date.parse(`${today}T00:00:00.000Z`);
  return Array.from({ length: 7 }, (_, index) => {
    const date = new Date(end - (6 - index) * DAY_MS);
    const key = date.toISOString().slice(0, 10);
    return {
      date: key,
      weekday: WEEKDAYS[date.getUTCDay()]!,
      state: byDate.get(key) ?? "OUTSIDE",
    };
  });
}

/** Giây thành giờ kiểu Việt Nam, một chữ số thập phân: 23040 → "6,4". */
export function formatCodingHours(seconds: number): string {
  return new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
    minimumFractionDigits: seconds % 3600 === 0 ? 0 : 1,
  }).format(seconds / 3600);
}

/** Trang nhật ký tạo hôm nay (theo múi giờ tài khoản), nếu có. */
export function journalEntryToday(
  latest: JournalEntryResponse | undefined,
  today: string,
  timeZone: string,
): JournalEntryResponse | null {
  if (!latest || latest.state === "TRASHED") return null;
  return calendarDayIn(latest.createdAt, timeZone) === today ? latest : null;
}

/** "hôm nay", "hôm qua", "3 ngày trước", "2 tuần trước"… */
export function describeDaysAgo(
  instant: string,
  today: string,
  timeZone: string,
): string {
  const days = Math.round(
    (Date.parse(`${today}T00:00:00.000Z`) -
      Date.parse(`${calendarDayIn(instant, timeZone)}T00:00:00.000Z`)) /
      DAY_MS,
  );
  if (days <= 0) return "hôm nay";
  if (days === 1) return "hôm qua";
  if (days < 14) return `${days} ngày trước`;
  if (days < 60) return `${Math.round(days / 7)} tuần trước`;
  return `${Math.round(days / 30)} tháng trước`;
}
