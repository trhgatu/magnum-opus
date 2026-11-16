import type { MoodLabel } from '../mood/mood.js';

/**
 * habitTitle null: habit đã bị xóa vĩnh viễn, tên đã được quên.
 * habitId null: snapshot cũ chỉ lưu tên.
 */
export interface ChronicleHabitRef {
  habitId: string | null;
  habitTitle: string | null;
}

export interface ChronicleHabitSection {
  buildCompletionRate: number;
  bestStreak: (ChronicleHabitRef & { days: number }) | null;
  mostConsistentHabit: (ChronicleHabitRef & { completionRate: number }) | null;
  quitHabits: Array<ChronicleHabitRef & { daysSinceLastRelapse: number }>;
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
