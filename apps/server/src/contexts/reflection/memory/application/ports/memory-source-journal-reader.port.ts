export const MEMORY_SOURCE_JOURNAL_READER = Symbol(
  'MEMORY_SOURCE_JOURNAL_READER',
);

export enum MemorySourceJournalStatus {
  AVAILABLE = 'AVAILABLE',
  TRASHED = 'TRASHED',
  NOT_FOUND = 'NOT_FOUND',
}

export interface MemorySourceJournalReader {
  getStatusForOwner(
    journalEntryId: string,
    ownerId: string,
  ): Promise<MemorySourceJournalStatus>;
}
