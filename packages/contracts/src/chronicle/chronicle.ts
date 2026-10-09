import type { MoodLabel } from '../mood/mood.js';

export interface ChronicleHabitSection {
  buildCompletionRate: number;
  bestStreak: {
    habitTitle: string;
    days: number;
  } | null;
  mostConsistentHabit: { habitTitle: string; completionRate: number } | null;
  quitHabits: Array<{ habitTitle: string; daysSinceLastRelapse: number }>;
}

export interface ChronicleRoutineSection {
  completionRate: number;
}

export interface ChronicleProjectSection {
  activeCount: number;
  completedCount: number;
  stoppedCount: number;
}

export interface ChronicleJournalSection {
  entryCount: number;
}

export interface ChronicleMoodSection {
  dominantMood: MoodLabel | null;
  distribution: Partial<Record<MoodLabel, number>>;
}

export interface ChronicleMemorySection {
  memoryCount: number;
}

export interface ChronicleResponse {
  year: number;
  month: number;
  computedAt: string;
  habit: ChronicleHabitSection;
  routine: ChronicleRoutineSection;
  project: ChronicleProjectSection;
  journal: ChronicleJournalSection;
  mood: ChronicleMoodSection;
  memory: ChronicleMemorySection;
}
