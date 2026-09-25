import { ChronicleMoodLabel } from '../../domain/enums';

export interface MoodSectionData {
  domiantMood: ChronicleMoodLabel | null;
  distribution: Partial<Record<ChronicleMoodLabel, number>>;
}
