export interface HabitRelapseResponse {
  id: string;
  habitId: string;
  occurredAt: string;
}

export type HabitProgressSinceReason = 'RELAPSE' | 'QUIT_STARTED_AT';

export interface HabitProgressResponse {
  habitId: string;
  since: string;
  sinceReason: HabitProgressSinceReason;
  daysSince: number;
}
