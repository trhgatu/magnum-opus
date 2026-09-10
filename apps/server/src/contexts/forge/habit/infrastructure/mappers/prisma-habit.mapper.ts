import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
  HabitType as PrismaHabitType,
} from '@repo/database';

import { HabitFrequencyType, HabitType } from '../../domain/enums';
import { Habit } from '../../domain/habit.aggregate';
import { HabitFrequency, HabitId } from '../../domain/value-objects';

const domainFrequencyTypes: Record<
  PrismaHabitFrequencyType,
  HabitFrequencyType
> = {
  [PrismaHabitFrequencyType.DAILY]: HabitFrequencyType.DAILY,
  [PrismaHabitFrequencyType.WEEKLY]: HabitFrequencyType.WEEKLY,
};

const persistenceFrequencyTypes: Record<
  HabitFrequencyType,
  PrismaHabitFrequencyType
> = {
  [HabitFrequencyType.DAILY]: PrismaHabitFrequencyType.DAILY,
  [HabitFrequencyType.WEEKLY]: PrismaHabitFrequencyType.WEEKLY,
};

const domainHabitTypes: Record<PrismaHabitType, HabitType> = {
  [PrismaHabitType.BUILD]: HabitType.BUILD,
  [PrismaHabitType.QUIT]: HabitType.QUIT,
};

const persistenceHabitTypes: Record<HabitType, PrismaHabitType> = {
  [HabitType.BUILD]: PrismaHabitType.BUILD,
  [HabitType.QUIT]: PrismaHabitType.QUIT,
};

export class PrismaHabitMapper {
  public static toDomain(raw: PrismaHabit): Habit {
    return Habit.rehydrate({
      id: new HabitId(raw.id),
      ownerId: raw.ownerId,
      title: raw.title,
      description: raw.description,
      type: domainHabitTypes[raw.type],
      frequency:
        raw.frequencyType === null
          ? null
          : HabitFrequency.rehydrate(
              domainFrequencyTypes[raw.frequencyType],
              raw.frequencyDays,
            ),
      quitStartedAt: raw.quitStartedAt,
      isActive: raw.isActive,
      revision: raw.revision,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(habit: Habit): PrismaHabit {
    const props = habit.toPrimitives();

    return {
      id: props.id,
      ownerId: props.ownerId,
      title: props.title,
      description: props.description,
      type: persistenceHabitTypes[props.type],
      frequencyType:
        props.frequencyType === null
          ? null
          : persistenceFrequencyTypes[props.frequencyType],
      frequencyDays: props.frequencyDays,
      quitStartedAt: props.quitStartedAt,
      isActive: props.isActive,
      revision: props.revision,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}
