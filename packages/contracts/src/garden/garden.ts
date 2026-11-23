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
  /** Tên lúc gieo; khác `name` khi Habit đã đổi tên (Q-GDN-10). */
  nameAtPlanting: string;
  bed: { id: string; name: string } | null;
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
  light: number;
}
