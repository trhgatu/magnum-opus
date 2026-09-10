export const HABIT_FREQUENCY_TYPES = ['DAILY', 'WEEKLY'] as const;

export type HabitFrequencyType = (typeof HABIT_FREQUENCY_TYPES)[number];

export const HABIT_TYPES = ['BUILD', 'QUIT'] as const;

export type HabitType = (typeof HABIT_TYPES)[number];

export interface HabitResponse {
  id: string;
  title: string;
  description: string | null;
  type: HabitType;
  frequencyType: HabitFrequencyType | null;
  frequencyDays: number[];
  quitStartedAt: string | null;
  isActive: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
