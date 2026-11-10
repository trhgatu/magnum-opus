import type { OnThisDayKind } from '@repo/contracts';
import type { CalendarDay } from '@shared/domain/calendar-day';

import type { OnThisDayRecord } from '../ports/on-this-day-reader.port';

export interface OnThisDayItem extends OnThisDayRecord {
  kind: OnThisDayKind;
  yearsAgo: number;
}

const isLeapYear = (year: number) =>
  (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;

export function onThisDayMonthDays(today: CalendarDay): string[] {
  const monthDay = today.slice(5);
  return monthDay === '02-28' && !isLeapYear(Number(today.slice(0, 4)))
    ? ['02-28', '02-29']
    : [monthDay];
}

export function toOnThisDayItems(
  today: CalendarDay,
  memories: readonly OnThisDayRecord[],
  journalEntries: readonly OnThisDayRecord[],
): OnThisDayItem[] {
  const year = Number(today.slice(0, 4));
  const tag = (kind: OnThisDayKind) => (record: OnThisDayRecord) => ({
    ...record,
    kind,
    yearsAgo: year - Number(record.day.slice(0, 4)),
  });

  const distilled = new Set(
    memories.flatMap((memory) =>
      memory.sourceJournalEntryId ? [memory.sourceJournalEntryId] : [],
    ),
  );

  return [
    ...memories.map(tag('MEMORY')),
    ...journalEntries
      .filter((entry) => !distilled.has(entry.id))
      .map(tag('JOURNAL')),
  ].sort(
    (a, b) =>
      a.yearsAgo - b.yearsAgo ||
      (a.kind === b.kind ? 0 : a.kind === 'MEMORY' ? -1 : 1),
  );
}
