import type { HabitProgressResponse } from '@repo/contracts';

import type { HabitProgressResult } from '../../application/queries/handlers/get-habit-progress.handler';

export class HabitProgressPresenter {
  public static toResponse(result: HabitProgressResult): HabitProgressResponse {
    return {
      habitId: result.habitId,
      since: result.since,
      sinceReason: result.sinceReason,
      daysSince: result.daysSince,
    };
  }
}
