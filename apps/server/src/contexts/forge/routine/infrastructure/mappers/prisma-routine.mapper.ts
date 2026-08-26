import {
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
} from '@repo/database';

import { Routine } from '../../domain/routine.aggregate';
import { RoutineId } from '../../domain/value-objects';

export type PrismaRoutineWithHabits = PrismaRoutine & {
  habits: PrismaRoutineHabit[];
};

export interface RoutinePersistence {
  routine: PrismaRoutine;
  habits: PrismaRoutineHabit[];
}

export class PrismaRoutineMapper {
  public static toDomain(raw: PrismaRoutineWithHabits): Routine {
    const habitIds = [...raw.habits]
      .sort((left, right) => left.order - right.order)
      .map((membership) => membership.habitId);

    return Routine.rehydrate({
      id: new RoutineId(raw.id),
      ownerId: raw.ownerId,
      title: raw.title,
      habitIds,
      isActive: raw.isActive,
      revision: raw.revision,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(routine: Routine): RoutinePersistence {
    const props = routine.toPrimitives();

    return {
      routine: {
        id: props.id,
        ownerId: props.ownerId,
        title: props.title,
        isActive: props.isActive,
        revision: props.revision,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
      habits: props.habitIds.map((habitId, index) => ({
        routineId: props.id,
        habitId,
        ownerId: props.ownerId,
        order: index + 1,
      })),
    };
  }
}
