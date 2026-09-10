import type { HabitRelapseResponse } from '@repo/contracts';

import { HabitRelapse } from '../../domain/habit-relapse.aggregate';

export class HabitRelapsePresenter {
  public static toResponse(relapse: HabitRelapse): HabitRelapseResponse {
    const data = relapse.toPrimitives();

    return {
      id: data.id,
      habitId: data.habitId,
      occurredAt: data.occurredAt.toISOString(),
    };
  }
}
