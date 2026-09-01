import type { ForgeTodayResponse } from '@repo/contracts';

import type { TodayReadModel } from '../../application/ports/today-reader.port';

export class TodayPresenter {
  public static toResponse(today: TodayReadModel): ForgeTodayResponse {
    return {
      date: today.date,
      timeZone: today.timeZone,
      emptyReason: today.emptyReason,
      routines: today.routines.map((routine) => ({
        id: routine.id,
        title: routine.title,
        habits: routine.habits.map((habit) => ({
          id: habit.id,
          title: habit.title,
          description: habit.description,
          checkedIn: habit.checkedIn,
        })),
      })),
      standaloneHabits: today.standaloneHabits.map((habit) => ({
        id: habit.id,
        title: habit.title,
        description: habit.description,
        checkedIn: habit.checkedIn,
      })),
    };
  }
}
