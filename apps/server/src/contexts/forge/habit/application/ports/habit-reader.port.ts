import { Habit } from '../../domain/habit.aggregate';

export const HABIT_READER = Symbol('HABIT_READER');

export type HabitSortField = 'title' | 'createdAt' | 'updatedAt';

export interface FindHabitsOptions {
  skip: number;
  take: number;
  isActive?: boolean;
  search?: string;
  sortBy?: HabitSortField;
  sortOrder?: 'asc' | 'desc';
}

export interface FindHabitsResult {
  habits: Habit[];
  total: number;
}

export interface HabitReader {
  findAllForOwner(
    ownerId: string,
    options: FindHabitsOptions,
  ): Promise<FindHabitsResult>;
}
