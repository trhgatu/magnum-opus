import type { MoodLabel } from '../mood/mood.js';

export const JOURNAL_ENTRY_STATES = ['DRAFT', 'SEALED', 'TRASHED'] as const;

export type JournalEntryState = (typeof JOURNAL_ENTRY_STATES)[number];

export interface JournalEntryResponse {
  id: string;
  title: string | null;
  content: string;
  state: JournalEntryState;
  stateBeforeTrash: JournalEntryState | null;
  revision: number;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface JournalEntryListItemResponse extends JournalEntryResponse {
  mood: MoodLabel | null;
  memoryCount: number;
}

export interface JournalSummaryResponse {
  writtenDaysLast7: number;
}
