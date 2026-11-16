export interface HabitSectionData {
  buildCompletionRate: number;
  bestStreak: {
    habitId: string | null;
    habitTitle: string | null;
    days: number;
  } | null;
  mostConsistentHabit: {
    habitId: string | null;
    habitTitle: string | null;
    completionRate: number;
  } | null;
  quitHabits: Array<{
    habitId: string | null;
    habitTitle: string | null;
    daysSinceLastRelapse: number;
  }>;
}
