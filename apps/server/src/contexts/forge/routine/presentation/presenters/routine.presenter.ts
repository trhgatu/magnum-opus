import type {
  RoutineResponse,
  RoutineDetailResponse,
  RoutineHabitOptionResponse,
} from '@repo/contracts';

import type {
  RoutineDetailReadModel,
  RoutineHabitOptionReadModel,
} from '../../application/ports/routine-reader.port';

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

  public static toDetailResponse(
    detail: RoutineDetailReadModel,
  ): RoutineDetailResponse {
    return {
      id: detail.id,
      title: detail.title,
      habits: detail.habits.map((habit) => ({
        id: habit.id,
        title: habit.title,
        isActive: habit.isActive,
        order: habit.order,
      })),
      isActive: detail.isActive,
      revision: detail.revision,
      createdAt: detail.createdAt.toISOString(),
      updatedAt: detail.updatedAt.toISOString(),
    };
  }

  public static toHabitOptionResponse(
    habit: RoutineHabitOptionReadModel,
  ): RoutineHabitOptionResponse {
    return {
      id: habit.id,
      title: habit.title,
    };
  }
}
