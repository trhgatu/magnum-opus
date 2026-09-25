import { ChroniclePeriod } from '../../domain/value-objects';
import { RoutineSectionData } from '../section-data';

export const ROUTINE_CHRONICLE_READER = Symbol('ROUTINE_CHRONICLE_READER');

export interface RoutineChronicleReader {
  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<RoutineSectionData>;
}
