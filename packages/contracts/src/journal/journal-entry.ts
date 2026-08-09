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
