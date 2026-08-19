export const TIMELINE_WRITER = Symbol('TIMELINE_WRITER');

export interface TimelineWriter {
  recordJournalSealed(
    ownerId: string,
    journalEntryId: string,
    sealedAt: Date,
  ): Promise<void>;

  recordMemoryCreated(
    ownerId: string,
    memoryId: string,
    memoryOccurredOn: Date | null,
  ): Promise<void>;
}
