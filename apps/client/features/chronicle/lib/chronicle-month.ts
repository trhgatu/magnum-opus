export interface ChronicleMonth {
  year: number;
  month: number;
}

const MIN_YEAR = 1970;
const MAX_YEAR = 9998;

/** Đọc `/chronicle/[year]/[month]` — null nếu không phải 1 tháng hợp lệ. */
export function parseChronicleMonth(
  year: string,
  month: string,
): ChronicleMonth | null {
  if (!/^\d{4}$/.test(year) || !/^\d{1,2}$/.test(month)) {
    return null;
  }

  const parsed = { year: Number(year), month: Number(month) };

  return isChronicleMonthInRange(parsed) ? parsed : null;
}

/** Tháng nằm trong khoảng Chronicle nhận (năm 1970–9998). */
export function isChronicleMonthInRange({
  year,
  month,
}: ChronicleMonth): boolean {
  return year >= MIN_YEAR && year <= MAX_YEAR && month >= 1 && month <= 12;
}

/** Tháng chứa ngày lịch `YYYY-MM-DD` (vd ngày hôm nay theo múi giờ owner). */
export function monthOfDay(day: string): ChronicleMonth {
  return { year: Number(day.slice(0, 4)), month: Number(day.slice(5, 7)) };
}

export function shiftMonth(
  { year, month }: ChronicleMonth,
  delta: number,
): ChronicleMonth {
  const index = year * 12 + (month - 1) + delta;

  return { year: Math.floor(index / 12), month: (index % 12) + 1 };
}

export function compareMonths(a: ChronicleMonth, b: ChronicleMonth): number {
  return a.year * 12 + a.month - (b.year * 12 + b.month);
}

export function chronicleHref({ year, month }: ChronicleMonth): string {
  return `/chronicle/${year}/${month}`;
}

export function formatChronicleMonth({ year, month }: ChronicleMonth): string {
  return `Tháng ${month} · ${year}`;
}
