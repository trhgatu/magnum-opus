export type GardenSubjectKind = 'HABIT';
export type GardenVariant = 'BUILD' | 'QUIT';
export type GardenWeekStatus = 'CARED' | 'PENDING' | 'RESTED' | 'SKIPPED';

export interface GardenWeekResponse {
  /** Thứ Hai của tuần, `YYYY-MM-DD` theo múi giờ tài khoản. */
  start: string;
  status: GardenWeekStatus;
  scarred: boolean;
}

export interface GardenTreeResponse {
  id: string;
  subjectKind: GardenSubjectKind;
  subjectId: string;
  variant: GardenVariant;
  name: string;
  simVersion: number;
  plantedOn: string;
  weeks: GardenWeekResponse[];
  /** Bậc cỏ, 0 là không có cỏ. */
  weeds: number;
}

export interface GardenResponse {
  /** Hôm nay theo múi giờ tài khoản. */
  today: string;
  trees: GardenTreeResponse[];
}
