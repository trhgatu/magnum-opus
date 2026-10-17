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

/**
 * Thời điểm 00:00 của `day` tại `timeZone`. Tính lệch múi giờ hai lần vì
 * ngày đổi giờ mùa hè: lệch ở 00:00 UTC chưa chắc là lệch ở 00:00 địa phương.
 */
export function startOfDay(day: CalendarDay, timeZone: string): Date {
  const [year, month, date] = day.split('-').map(Number);
  const asUtc = Date.UTC(year, month - 1, date);
  const firstGuess = asUtc - offsetMs(asUtc, timeZone);
  return new Date(asUtc - offsetMs(firstGuess, timeZone));
}

/** Lệch của múi giờ so với UTC tại một thời điểm (UTC+7 → 7 giờ). */
function offsetMs(instantMs: number, timeZone: string): number {
  const wholeSecond = Math.floor(instantMs / 1000) * 1000;
  const part = wallClock(wholeSecond, timeZone);
  const wallAsUtc = Date.UTC(
    part.year,
    part.month - 1,
    part.day,
    part.hour,
    part.minute,
    part.second,
  );
  return wallAsUtc - wholeSecond;
}

function wallClock(instantMs: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    hourCycle: 'h23',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  }).formatToParts(new Date(instantMs));
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? 0);
  return {
    year: value('year'),
    month: value('month'),
    day: value('day'),
    hour: value('hour'),
    minute: value('minute'),
    second: value('second'),
  };
}

const pad = (value: number, width = 2) => String(value).padStart(width, '0');
