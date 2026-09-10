export const HABIT_PROGRESS_READER = Symbol('HABIT_PROGRESS_READER');

export type HabitProgressSinceReason = 'RELAPSE' | 'QUIT_STARTED_AT';

export interface HabitProgressReadModel {
  sinceDate: Date;
  sinceReason: HabitProgressSinceReason;
}

export interface HabitProgressReader {
  getProgressFor(
    habitId: string,
    ownerId: string,
  ): Promise<HabitProgressReadModel>;
}
