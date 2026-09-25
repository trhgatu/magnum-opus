import { ChroniclePeriod } from '../../domain/value-objects';
import { HabitSectionData } from '../section-data';

export const HABIT_CHRONICLE_READER = Symbol('HABIT_CHRONICLE_READER');

export interface HabitChronicleReader {
  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<HabitSectionData>;
}
