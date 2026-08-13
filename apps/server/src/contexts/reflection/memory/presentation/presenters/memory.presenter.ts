import type { MemoryResponse } from '@repo/contracts';

import { Memory } from '../../domain/memory.aggregate';

export class MemoryPresenter {
  public static toResponse(memory: Memory): MemoryResponse {
    const data = memory.toPrimitives();

    return {
      id: data.id,
      sourceJournalEntryId: data.sourceJournalEntryId,
      title: data.title,
      content: data.content,
      occurredOn: data.occurredOn,
      occurredOnPrecision: data.occurredOnPrecision,
      state: data.state,
      revision: data.revision,
      trashedAt: data.trashedAt?.toISOString() ?? null,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
