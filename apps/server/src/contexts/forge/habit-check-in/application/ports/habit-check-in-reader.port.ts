export const HABIT_CHECK_IN_READER = Symbol('HABIT_CHECK_IN_READER');

export interface HabitCheckInReadModel {
  id: string;
  habitId: string;
  date: string;
  createdAt: Date;
}

export interface HabitCheckInReader {
  findForHabitOnDate(
    habitId: string,
    ownerId: string,
    date: string,
  ): Promise<HabitCheckInReadModel | null>;

  findForHabitInRange(
    habitId: string,
    ownerId: string,
    from: string,
    to: string,
  ): Promise<HabitCheckInReadModel[]>;
}
