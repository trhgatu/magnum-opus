import { Habit } from '../habit.aggregate';

export const HABIT_REPOSITORY = Symbol('HABIT_REPOSITORY');

export interface HabitRepository {
  create(habit: Habit): Promise<void>;

  update(habit: Habit, expectedRevision: number): Promise<boolean>;

  findByIdForOwner(id: string, ownerId: string): Promise<Habit | null>;
}
