export const OWNED_HABIT_READER = Symbol('OWNED_HABIT_READER');

export interface OwnedHabitReadModel {
  id: string;
  isActive: boolean;
}

export interface OwnedHabitReader {
  findByIdForOwner(
    habitId: string,
    ownerId: string,
  ): Promise<OwnedHabitReadModel | null>;
}
