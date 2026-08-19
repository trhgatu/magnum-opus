import type { TimelineEntryType } from '@repo/contracts';

export const TIMELINE_READER = Symbol('TIMELINE_READER');

export interface TimelineEntryRecord {
  id: string;
  entryType: TimelineEntryType;
  sourceId: string;
  occurredOn: Date;
  title: string | null;
  sourceExists: boolean;
}

export interface FindTimelineOptions {
  skip: number;
  take: number;
}

export interface FindTimelineResult {
  entries: TimelineEntryRecord[];
  total: number;
}

export interface TimelineReader {
  findAllForOwner(
    ownerId: string,
    options: FindTimelineOptions,
  ): Promise<FindTimelineResult>;
}
