import { ChroniclePeriod } from '../../domain/value-objects';
import { MemorySectionData } from '../section-data';

export const MEMORY_CHRONICLE_READER = Symbol('MEMORY_CHRONICLE_READER');

export interface MemoryChronicleReader {
  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<MemorySectionData>;
}
