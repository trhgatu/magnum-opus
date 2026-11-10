import type { CalendarDay } from '@shared/domain/calendar-day';

export const ON_THIS_DAY_READER = Symbol('ON_THIS_DAY_READER');

export interface OnThisDayRecord {
  id: string;
  title: string | null;
  day: CalendarDay;
  excerpt: string | null;
  sourceJournalEntryId: string | null;
}

export interface OnThisDayReader {
  getTimeZone(ownerId: string): Promise<string>;

  findMemories(
    ownerId: string,
    monthDays: readonly string[],
    beforeYear: number,
  ): Promise<OnThisDayRecord[]>;

  findJournalEntries(
    ownerId: string,
    monthDays: readonly string[],
    beforeYear: number,
    timeZone: string,
  ): Promise<OnThisDayRecord[]>;
}
