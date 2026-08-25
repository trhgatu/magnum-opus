export const CHECK_IN_HABIT_READER = Symbol('CHECK_IN_HABIT_READER');

export interface CheckInHabitReadModel {
  id: string;
  isActive: boolean;
}

export interface CheckInHabitReader {
  findByIdForOwner(
    habitId: string,
    ownerId: string,
  ): Promise<CheckInHabitReadModel | null>;
}
