import { ChronicleMoodLabel } from '../../domain/enums';

export interface MoodSectionData {
  dominantMood: ChronicleMoodLabel | null;
  distribution: Partial<Record<ChronicleMoodLabel, number>>;
}
