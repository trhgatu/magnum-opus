import { ChroniclePeriod } from '../../domain/value-objects';
import { JournalSectionData } from '../section-data';

export const JOURNAL_CHRONICLE_READER = Symbol('JOURNAL_CHRONICLE_READER');

export interface JournalChronicleReader {
  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<JournalSectionData>;
}
