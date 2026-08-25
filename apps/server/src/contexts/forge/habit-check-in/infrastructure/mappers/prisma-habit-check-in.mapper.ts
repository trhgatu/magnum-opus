import { HabitCheckIn as PrismaHabitCheckIn } from '@repo/database';

import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { HabitCheckInDate, HabitCheckInId } from '../../domain/value-objects';

export class PrismaHabitCheckInMapper {
  public static toDomain(raw: PrismaHabitCheckIn): HabitCheckIn {
    return HabitCheckIn.rehydrate({
      id: HabitCheckInId.create(raw.id),
      habitId: raw.habitId,
      ownerId: raw.ownerId,
      date: HabitCheckInDate.create(raw.date.toISOString().slice(0, 10)),
      createdAt: raw.createdAt,
    });
  }

  public static toPersistence(checkIn: HabitCheckIn): PrismaHabitCheckIn {
    const props = checkIn.toPrimitives();

    return {
      id: props.id,
      habitId: props.habitId,
      ownerId: props.ownerId,
      date: HabitCheckInDate.create(props.date).toPersistenceDate(),
      createdAt: props.createdAt,
    };
  }
}
