export interface HabitSectionData {
  buildCompletionRate: number;
  bestStreak: { habitTitle: string; days: number } | null;
  mostConsistentHabit: {
    habitTitle: string;
    completionRate: number;
  } | null;
  quitHabits: Array<{ habitTitle: string; daysSinceLastRelapse: number }>;
}
