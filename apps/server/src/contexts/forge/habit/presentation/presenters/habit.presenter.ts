import type { HabitResponse } from '@repo/contracts';

import { Habit } from '../../domain/habit.aggregate';

export class HabitPresenter {
  public static toResponse(habit: Habit): HabitResponse {
    const data = habit.toPrimitives();

    return {
      id: data.id,
      title: data.title,
      description: data.description,
      type: data.type,
      frequencyType: data.frequencyType,
      frequencyDays: data.frequencyDays,
      quitStartedAt: data.quitStartedAt?.toISOString().slice(0, 10) ?? null,
      isActive: data.isActive,
      revision: data.revision,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
