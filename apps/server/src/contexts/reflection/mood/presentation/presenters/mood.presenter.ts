import type { MoodResponse } from '@repo/contracts';

import { Mood } from '../../domain/mood.aggregate';

export class MoodPresenter {
  public static toResponse(mood: Mood): MoodResponse {
    const data = mood.toPrimitives();

    return {
      id: data.id,
      journalEntryId: data.journalEntryId,
      label: data.label,
      intensity: data.intensity,
      note: data.note,
      revision: data.revision,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
