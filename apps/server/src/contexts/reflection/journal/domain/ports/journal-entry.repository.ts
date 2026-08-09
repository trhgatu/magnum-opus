import { JournalEntryState } from '../enums';
import { JournalEntry } from '../journal-entry.aggregate';

export const JOURNAL_ENTRY_REPOSITORY = Symbol('JOURNAL_ENTRY_REPOSITORY');

export type JournalEntrySortField = 'createdAt' | 'updatedAt';

export interface FindJournalEntriesOptions {
  skip: number;
  take: number;
  state?: JournalEntryState;
  search?: string;
  sortBy?: JournalEntrySortField;
  sortOrder?: 'asc' | 'desc';
}

export interface JournalEntryRepository {
  create(entry: JournalEntry): Promise<void>;

  update(entry: JournalEntry, expectedRevision: number): Promise<boolean>;

  findByIdForOwner(id: string, ownerId: string): Promise<JournalEntry | null>;

  findAllForOwner(
    ownerId: string,
    options: FindJournalEntriesOptions,
  ): Promise<{
    entries: JournalEntry[];
    total: number;
  }>;

  deletePermanently(
    id: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean>;
}
