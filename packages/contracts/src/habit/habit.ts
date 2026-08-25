export const HABIT_FREQUENCY_TYPES = ['DAILY', 'WEEKLY'] as const;

export type HabitFrequencyType = (typeof HABIT_FREQUENCY_TYPES)[number];

export interface HabitResponse {
  id: string;
  title: string;
  description: string | null;
  frequencyType: HabitFrequencyType;
  frequencyDays: number[];
  isActive: boolean;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
