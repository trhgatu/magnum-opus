import { ChroniclePeriod } from '../../domain/value-objects';
import { MoodSectionData } from '../section-data';

export const MOOD_CHRONICLE_READER = Symbol('MOOD_CHRONICLE_READER');

export interface MoodChronicleReader {
  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<MoodSectionData>;
}
