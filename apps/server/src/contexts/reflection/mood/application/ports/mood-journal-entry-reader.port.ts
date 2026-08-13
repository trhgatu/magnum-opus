export const MOOD_JOURNAL_ENTRY_READER = Symbol('MOOD_JOURNAL_ENTRY_READER');

export enum MoodJournalEntryAccessStatus {
  EDITABLE = 'EDITABLE',
  NOT_EDITABLE = 'NOT_EDITABLE',
  NOT_FOUND = 'NOT_FOUND',
}

export type MoodJournalEntryAccess =
  | { status: MoodJournalEntryAccessStatus.EDITABLE }
  | {
      status: MoodJournalEntryAccessStatus.NOT_EDITABLE;
      state: string;
    }
  | { status: MoodJournalEntryAccessStatus.NOT_FOUND };

export interface MoodJournalEntryReader {
  getAccessForOwner(
    journalEntryId: string,
    ownerId: string,
  ): Promise<MoodJournalEntryAccess>;
}
