import { type CalendarDay, daysBetween } from '@shared/domain/calendar-day';

export const LIGHT_FADE_DAYS = 28;

export function gardenLight(
  lastReflectedOn: CalendarDay | null,
  today: CalendarDay,
): number {
  if (!lastReflectedOn) return 0;
  const days = Math.max(0, daysBetween(lastReflectedOn, today));
  const light = Math.max(0, 1 - days / LIGHT_FADE_DAYS);
  return Math.round(light * 100) / 100;
}
