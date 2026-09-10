import { HabitRelapse as PrismaHabitRelapse } from '@repo/database';

import { HabitRelapse } from '../../domain/habit-relapse.aggregate';
import { HabitRelapseId } from '../../domain/value-objects';

export class PrismaHabitRelapseMapper {
  public static toDomain(raw: PrismaHabitRelapse): HabitRelapse {
    return HabitRelapse.rehydrate({
      id: HabitRelapseId.create(raw.id),
      habitId: raw.habitId,
      ownerId: raw.ownerId,
      occurredAt: raw.occurredAt,
      createdAt: raw.createdAt,
    });
  }

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
