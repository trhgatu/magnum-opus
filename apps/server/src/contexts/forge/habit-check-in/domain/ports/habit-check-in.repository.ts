import { HabitCheckIn } from '../habit-check-in.aggregate';

export const HABIT_CHECK_IN_REPOSITORY = Symbol('HABIT_CHECK_IN_REPOSITORY');

export interface HabitCheckInRepository {
  createIfAbsent(checkIn: HabitCheckIn): Promise<HabitCheckIn>;
  findByHabitAndDateForOwner(
    habitId: string,
    ownerId: string,
    date: string,
  ): Promise<HabitCheckIn | null>;
  deleteByHabitAndDateForOwner(
    habitId: string,
    ownerId: string,
    date: string,
  ): Promise<boolean>;
}
