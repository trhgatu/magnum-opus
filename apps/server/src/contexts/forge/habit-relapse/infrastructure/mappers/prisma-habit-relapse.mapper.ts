import { HabitRelapse as PrismaHabitRelapse } from '@repo/database';

import { HabitRelapse } from '../../domain/habit-relapse.aggregate';

export class PrismaHabitRelapseMapper {
  public static toPersistence(relapse: HabitRelapse): PrismaHabitRelapse {
    const props = relapse.toPrimitives();

    return {
      id: props.id,
      habitId: props.habitId,
      ownerId: props.ownerId,
      occurredAt: props.occurredAt,
      createdAt: props.createdAt,
    };
  }
}
