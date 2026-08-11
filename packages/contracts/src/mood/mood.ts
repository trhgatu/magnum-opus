export const MOOD_LABELS = [
  'JOYFUL',
  'CALM',
  'HOPEFUL',
  'ENERGETIC',
  'NEUTRAL',
  'TIRED',
  'ANXIOUS',
  'SAD',
  'ANGRY',
  'OVERWHELMED',
] as const;

export type MoodLabel = (typeof MOOD_LABELS)[number];

export interface MoodResponse {
  id: string;
  journalEntryId: string;
  label: MoodLabel;
  intensity: number | null;
  note: string | null;
  revision: number;
  createdAt: string;
  updatedAt: string;
}
