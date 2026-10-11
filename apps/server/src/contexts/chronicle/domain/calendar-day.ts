/**
 * Ngày lịch dạng chuỗi `YYYY-MM-DD`. So sánh chuỗi trực tiếp đúng thứ tự
 * thời gian (năm luôn 4 chữ số), nên dùng được `<`, `<=` như với số.
 */
export type CalendarDay = string;

const DAY_MS = 24 * 60 * 60 * 1000;

/** Ngày lịch của `instant` tại `timeZone` (vd 2026-08-31T17:30Z ở UTC+7 → '2026-09-01'). */
export function calendarDayAt(instant: Date, timeZone: string): CalendarDay {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(instant);

  const part = (type: Intl.DateTimeFormatPartTypes): string =>
    parts.find((candidate) => candidate.type === type)?.value ?? '';

  return `${part('year')}-${part('month')}-${part('day')}`;
}

/** Cột `@db.Date` Prisma trả về Date lúc 00:00Z — lấy đúng phần ngày. */
export function calendarDayOf(date: Date): CalendarDay {
  return date.toISOString().slice(0, 10);
}

export function addDays(day: CalendarDay, amount: number): CalendarDay {
  return calendarDayOf(
    new Date(Date.parse(`${day}T00:00:00.000Z`) + amount * DAY_MS),
  );
}

/** Số ngày từ `from` tới `to` (to - from). */
export function daysBetween(from: CalendarDay, to: CalendarDay): number {
  return Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      DAY_MS,
  );
}

/** Thứ trong tuần theo ISO: 1 = Thứ 2 … 7 = Chủ nhật. */
export function isoWeekday(day: CalendarDay): number {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();

  return weekday === 0 ? 7 : weekday;
}

/** Mọi ngày trong khoảng nửa mở [from, to). */
export function eachDay(from: CalendarDay, to: CalendarDay): CalendarDay[] {
  const days: CalendarDay[] = [];

  for (let day = from; day < to; day = addDays(day, 1)) {
    days.push(day);
  }

  return days;
}

/** Ngược lại với calendarDayOf — để lọc cột `@db.Date` trong Prisma. */
export function calendarDayToDate(day: CalendarDay): Date {
  return new Date(`${day}T00:00:00.000Z`);
}
