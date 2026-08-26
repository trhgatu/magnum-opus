import type { RoutineResponse } from '@repo/contracts';

import { Routine } from '../../domain/routine.aggregate';

export class RoutinePresenter {
  public static toResponse(routine: Routine): RoutineResponse {
    const data = routine.toPrimitives();

    return {
      id: data.id,
      title: data.title,
      habitIds: data.habitIds,
      isActive: data.isActive,
      revision: data.revision,
      createdAt: data.createdAt.toISOString(),
      updatedAt: data.updatedAt.toISOString(),
    };
  }
}
