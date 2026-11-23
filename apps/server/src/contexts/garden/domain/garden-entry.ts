export type GardenEntryKind =
  | 'TENDED'
  | 'UNTENDED'
  | 'MARKED'
  | 'RESTED'
  | 'RESUMED'
  | 'RHYTHM_SET'
  | 'REFLECTED';

export type GardenMark = 'SCAR';

export type GardenSchedule = {
  type: 'DAILY' | 'WEEKLY';
  days: number[];
};
