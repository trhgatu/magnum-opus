import {
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
} from '@repo/database';

import { HabitFrequencyType } from '../../domain/enums';
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

export class PrismaHabitMapper {
  public static toDomain(raw: PrismaHabit): Habit {
    return Habit.rehydrate({
      id: new HabitId(raw.id),
      ownerId: raw.ownerId,
      title: raw.title,
      description: raw.description,
      frequency: HabitFrequency.rehydrate(
        domainFrequencyTypes[raw.frequencyType],
        raw.frequencyDays,
      ),
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
      frequencyType: persistenceFrequencyTypes[props.frequencyType],
      frequencyDays: props.frequencyDays,
      isActive: props.isActive,
      revision: props.revision,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
}
