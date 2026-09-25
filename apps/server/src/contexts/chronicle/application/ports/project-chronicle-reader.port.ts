import { ChroniclePeriod } from '../../domain/value-objects';
import { ProjectSectionData } from '../section-data';

export const PROJECT_CHRONICLE_READER = Symbol('PROJECT_CHRONICLE_READER');

export interface ProjectChronicleReader {
  getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<ProjectSectionData>;
}
