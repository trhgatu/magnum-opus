export const FORGE_TODAY_EMPTY_REASONS = [
  'NO_ACTIVE_HABITS',
  'NOTHING_DUE',
] as const;

export type ForgeTodayEmptyReason = (typeof FORGE_TODAY_EMPTY_REASONS)[number];

export interface ForgeTodayHabitResponse {
  id: string;
  title: string;
  description: string | null;
  checkedIn: boolean;
}

export interface ForgeTodayRoutineResponse {
  id: string;
  title: string;
  habits: ForgeTodayHabitResponse[];
}

export interface ForgeTodayResponse {
  date: string;
  timeZone: string;
  emptyReason: ForgeTodayEmptyReason | null;
  routines: ForgeTodayRoutineResponse[];
  standaloneHabits: ForgeTodayHabitResponse[];
}
