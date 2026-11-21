export type GardenEntryKind =
  'TENDED' | 'UNTENDED' | 'MARKED' | 'RESTED' | 'RESUMED' | 'RHYTHM_SET';

export type GardenMark = 'SCAR';

export type GardenRhythm = {
  type: 'DAILY' | 'WEEKLY';
  days: number[];
};
