/**
 * Ngày lịch dạng chuỗi `YYYY-MM-DD`. So sánh chuỗi trực tiếp đúng thứ tự
 * thời gian, nên dùng được `<`, `<=` như với số.
 */
export type CalendarDay = string;

const DAY_MS = 86_400_000;

/** Ngày lịch của `instant` tại `timeZone` (vd 2026-09-30T17:30Z ở UTC+7 → '2026-10-01'). */
export function calendarDayAt(instant: Date, timeZone: string): CalendarDay {
  const part = wallClock(instant.getTime(), timeZone);
  return `${pad(part.year, 4)}-${pad(part.month)}-${pad(part.day)}`;
}

export function addDays(day: CalendarDay, amount: number): CalendarDay {
  return new Date(Date.parse(`${day}T00:00:00.000Z`) + amount * DAY_MS)
    .toISOString()
    .slice(0, 10);
}

/** Mọi ngày từ `from` tới `to`, gồm cả hai đầu. */
export function eachDayInclusive(
  from: CalendarDay,
  to: CalendarDay,
): CalendarDay[] {
  const days: CalendarDay[] = [];
  for (let day = from; day <= to; day = addDays(day, 1)) days.push(day);
  return days;
}

/** Mọi múi giờ lệch UTC trong khoảng ±14 giờ. */
const MAX_OFFSET_MS = 14 * 60 * 60_000;

/**
 * Thời điểm đầu tiên thuộc `day` tại `timeZone` — thường là 00:00, nhưng
 * ở múi giờ nhảy giờ đúng nửa đêm (vd America/Santiago) 00:00 không tồn tại
 * và ngày bắt đầu lúc 01:00. Tìm nhị phân thay vì đoán độ lệch: ngày lịch
 * chỉ tăng theo thời gian.
 */
export function startOfDay(day: CalendarDay, timeZone: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const asUtc = Date.UTC(year, month - 1, date);
  let before = asUtc - MAX_OFFSET_MS; // chắc chắn còn ở ngày trước
  let from = asUtc + MAX_OFFSET_MS; // chắc chắn đã sang `day`
  while (from - before > 1) {
    const middle = Math.floor((before + from) / 2);
    if (calendarDayAt(new Date(middle), timeZone) < day) before = middle;
    else from = middle;
  }
  return new Date(from);
}

const formatters = new Map<string, Intl.DateTimeFormat>();

/** Một formatter cho mỗi múi giờ: tạo Intl.DateTimeFormat khá tốn. */
function formatterFor(timeZone: string): Intl.DateTimeFormat {
  let formatter = formatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat('en-US', {
      timeZone,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    formatters.set(timeZone, formatter);
  }
  return formatter;
}

function wallClock(instantMs: number, timeZone: string) {
  const parts = formatterFor(timeZone).formatToParts(new Date(instantMs));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return { year: value('year'), month: value('month'), day: value('day') };
}

const pad = (value: number, width = 2) => String(value).padStart(width, '0');
