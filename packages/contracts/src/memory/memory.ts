export const MEMORY_STATES = ['ACTIVE', 'TRASHED'] as const;
export type MemoryState = (typeof MEMORY_STATES)[number];

export const MEMORY_DATE_PRECISIONS = [
  'DAY',
  'MONTH',
  'YEAR',
  'UNKNOWN',
] as const;
export type MemoryDatePrecision = (typeof MEMORY_DATE_PRECISIONS)[number];

export interface MemoryResponse {
  id: string;
  sourceJournalEntryId: string | null;
  title: string;
  content: string;
  occurredOn: string | null;
  occurredOnPrecision: MemoryDatePrecision;
  state: MemoryState;
  revision: number;
  trashedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
