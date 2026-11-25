import type { MoodLabel } from '@repo/contracts';

export const JOURNAL_LIST_READER = Symbol('JOURNAL_LIST_READER');

export interface JournalEntryExtras {
  mood: MoodLabel | null;
  memoryCount: number;
}

export interface JournalListReader {
  extrasFor(
    ownerId: string,
    entryIds: readonly string[],
  ): Promise<Map<string, JournalEntryExtras>>;
  writtenDaysLast7(ownerId: string, now: Date): Promise<number>;
}
