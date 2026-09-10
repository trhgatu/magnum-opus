import { HabitRelapse } from '../habit-relapse.aggregate';

export const HABIT_RELAPSE_REPOSITORY = Symbol('HABIT_RELAPSE_REPOSITORY');

export interface HabitRelapseRepository {
  create(relapse: HabitRelapse): Promise<void>;
}
