export const TODAY_READER = Symbol('TODAY_READER');

export type TodayEmptyReason = 'NO_ACTIVE_HABITS' | 'NOTHING_DUE';

export interface TodayHabitReadModel {
  id: string;
  title: string;
  description: string | null;
  checkedIn: boolean;
}

export interface TodayRoutineReadModel {
  id: string;
  title: string;
  habits: TodayHabitReadModel[];
}

export interface TodayReadModel {
  date: string;
  timeZone: string;
  emptyReason: TodayEmptyReason | null;
  routines: TodayRoutineReadModel[];
  standaloneHabits: TodayHabitReadModel[];
}

export interface TodayReader {
  findForOwnerAt(ownerId: string, instant: Date): Promise<TodayReadModel>;
}
