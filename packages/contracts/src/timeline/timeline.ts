export const TIMELINE_ENTRY_TYPES = [
  'JOURNAL_SEALED',
  'MEMORY_CREATED',
] as const;
export type TimelineEntryType = (typeof TIMELINE_ENTRY_TYPES)[number];

export interface TimelineEntryResponse {
  id: string;
  entryType: TimelineEntryType;
  sourceId: string;
  occurredOn: string;
  title: string | null;
  sourceExists: boolean;
}
