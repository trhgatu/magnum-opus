export const HABIT_CHECK_IN_READER = Symbol('HABIT_CHECK_IN_READER');

export interface HabitCheckInReadModel {
  id: string;
  habitId: string;
  date: string;
  createdAt: Date;
}

export interface HabitCheckInReader {
  findForHabitInRange(
    habitId: string,
    ownerId: string,
    from: string,
    to: string,
  ): Promise<HabitCheckInReadModel[]>;
}
