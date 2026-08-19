import type { TimelineEntryResponse } from '@repo/contracts';

import type { TimelineEntryRecord } from '../../application/ports/timeline-reader.port';

export class TimelineEntryPresenter {
  static toResponse(entry: TimelineEntryRecord): TimelineEntryResponse {
    return {
      id: entry.id,
      entryType: entry.entryType,
      sourceId: entry.sourceId,
      occurredOn: entry.occurredOn.toISOString(),
      title: entry.title,
      sourceExists: entry.sourceExists,
    };
  }
}
