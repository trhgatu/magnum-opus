import type {
  HabitCheckInHistoryResponse,
  HabitCheckInResponse,
} from '@repo/contracts';

import { HabitCheckInReadModel } from '../../application/ports/habit-check-in-reader.port';
import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';

export class HabitCheckInPresenter {
  public static toResponse(checkIn: HabitCheckIn): HabitCheckInResponse {
    const data = checkIn.toPrimitives();
    return {
      id: data.id,
      habitId: data.habitId,
      date: data.date,
      createdAt: data.createdAt.toISOString(),
    };
  }

  public static toHistoryResponse(
    habitId: string,
    from: string,
    to: string,
    checkIns: HabitCheckInReadModel[],
  ): HabitCheckInHistoryResponse {
    return {
      habitId,
      from,
      to,
      dates: checkIns.map((checkIn) => checkIn.date),
    };
  }
}
