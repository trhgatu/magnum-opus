import { HabitSectionData } from './habit-section-data.type';
import { JournalSectionData } from './journal-section-data.type';
import { MemorySectionData } from './memory-section-data.type';
import { MoodSectionData } from './mood-section-data.type';
import { ProjectSectionData } from './project-section-data.type';
import { RoutineSectionData } from './routine-section-data.type';

export const CHRONICLE_MODULES = [
  'habit',
  'routine',
  'project',
  'journal',
  'mood',
  'memory',
] as const;

export type ChronicleModule = (typeof CHRONICLE_MODULES)[number];

export interface ChronicleSectionDataByModule {
  habit: HabitSectionData;
  routine: RoutineSectionData;
  project: ProjectSectionData;
  journal: JournalSectionData;
  mood: MoodSectionData;
  memory: MemorySectionData;
}
