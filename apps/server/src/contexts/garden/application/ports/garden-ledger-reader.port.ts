import type { CalendarDay } from '@shared/domain/calendar-day';

import type { GardenLedgerRow } from '../../domain/garden-week';
import type {
  GardenSubjectKind,
  GardenVariant,
} from '../../domain/garden-subject';

import type { GardenDatePrecision } from '../../domain/garden-lantern';
export const GARDEN_LEDGER_READER = Symbol('GARDEN_LEDGER_READER');

/** Một cây đang hiện trong vườn, kèm sổ của nó theo thứ tự ghi. */
export interface GardenSubjectLedger {
  id: string;
  subjectKind: GardenSubjectKind;
  subjectId: string;
  variant: GardenVariant;
  name: string;
  /** Tên lúc gieo, không bao giờ đổi; dùng cho câu chuyện của cây. */
  nameAtPlanting: string;
  simVersion: number;
  plantedOn: CalendarDay;
  entries: GardenLedgerRow[];
  bed: {
    id: string;
    name: string;
  } | null;
}

export interface GardenLedgerReader {
  /** Cây của owner, trừ cây đang ẩn (nguồn ở Thùng rác). */
  visibleSubjectsOf(ownerId: string): Promise<GardenSubjectLedger[]>;
  lastReflectedOn(
    ownerId: string,
    today: CalendarDay,
  ): Promise<CalendarDay | null>;
  visibleLanternsOf(ownerId: string): Promise<GardenLanternRow[]>;
}

export interface GardenLanternRow {
  id: string;
  memoryId: string;
  occurredOn: CalendarDay | null;
  precision: GardenDatePrecision;
  litOn: CalendarDay | null;
}
