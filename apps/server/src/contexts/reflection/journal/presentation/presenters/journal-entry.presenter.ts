import type { JournalEntryResponse } from '@repo/contracts';

import { JournalEntry } from '../../domain/journal-entry.aggregate';

export class JournalEntryPresenter {
  public static toResponse(entry: JournalEntry): JournalEntryResponse {
    const data = entry.toPrimitives();

    return {
      id: data.id,
      title: data.title,
      content: data.content,
      state: data.state,
      stateBeforeTrash: data.stateBeforeTrash,
      revision: data.revision,
      trashedAt: data.trashedAt?.toISOString() ?? null,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
