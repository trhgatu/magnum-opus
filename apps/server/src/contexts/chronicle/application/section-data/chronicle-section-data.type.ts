import { HabitSectionData } from './habit-section-data.type';
import { JournalSectionData } from './journal-section-data.type';
import { MemorySectionData } from './memory-section-data.type';
import { MoodSectionData } from './mood-section-data.type';
import { ProjectSectionData } from './project-section-data.type';
import { RoutineSectionData } from './routine-section-data.type';

export interface ChronicleSectionDataByModule {
  habit: HabitSectionData;
  routine: RoutineSectionData;
  project: ProjectSectionData;
  journal: JournalSectionData;
  mood: MoodSectionData;
  memory: MemorySectionData;
}

/** Tên module suy ra từ đúng 1 nguồn: các key của ChronicleSectionDataByModule. */
export type ChronicleModule = keyof ChronicleSectionDataByModule;

export const CHRONICLE_MODULES = [
  'habit',
  'routine',
  'project',
  'journal',
  'mood',
  'memory',
] as const satisfies readonly ChronicleModule[];

// Chiều ngược lại: mọi module trong ChronicleSectionDataByModule phải có mặt
// trong CHRONICLE_MODULES — thiếu là lỗi biên dịch ở dòng dưới.
type MissingFromChronicleModules = Exclude<
  ChronicleModule,
  (typeof CHRONICLE_MODULES)[number]
>;
const everyModuleListed: [MissingFromChronicleModules] extends [never]
  ? true
  : never = true;
void everyModuleListed;
