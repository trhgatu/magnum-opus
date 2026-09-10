export const ROUTINE_HABIT_READER = Symbol('ROUTINE_HABIT_READER');

export interface RoutineHabitReadModel {
  id: string;
  isActive: boolean;
  type: 'BUILD' | 'QUIT';
}

export interface RoutineHabitReader {
  findByIdForOwner(
    habitId: string,
    ownerId: string,
  ): Promise<RoutineHabitReadModel | null>;
}
