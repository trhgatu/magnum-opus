import type { CalendarDay } from '@shared/domain/calendar-day';

export const GARDEN_DATE_PRECISIONS = [
  'DAY',
  'MONTH',
  'YEAR',
  'UNKNOWN',
] as const;
export type GardenDatePrecision = (typeof GARDEN_DATE_PRECISIONS)[number];

/**
 * Độ chính xác từ sự kiện của Memory. Sự kiện cũ không mang precision thì
 * suy ra từ việc có ngày hay không.
 */
export function lanternPrecision(
  value: string | null,
  occurredOn: Date | null,
): GardenDatePrecision {
  if (!occurredOn) return 'UNKNOWN';
  const known = GARDEN_DATE_PRECISIONS.find((p) => p === value);
  return known && known !== 'UNKNOWN' ? known : 'DAY';
}

/**
 * Chỗ của đèn trên lối (BR-GDN-LN-003): tháng/năm xếp theo giữa kỳ;
 * không rõ ngày thì null, nghĩa là chùm ở đầu lối.
 */
export function lanternPlacedOn(
  occurredOn: CalendarDay | null,
  precision: GardenDatePrecision,
): CalendarDay | null {
  if (!occurredOn) return null;
  if (precision === 'MONTH') return `${occurredOn.slice(0, 7)}-15`;
  if (precision === 'YEAR') return `${occurredOn.slice(0, 4)}-07-01`;
  return occurredOn;
}
