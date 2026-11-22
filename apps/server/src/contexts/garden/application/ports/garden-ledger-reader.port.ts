import type { CalendarDay } from '@shared/domain/calendar-day';

import type { GardenLedgerRow } from '../../domain/garden-week';
import type {
  GardenSubjectKind,
  GardenVariant,
} from '../../domain/garden-subject';

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
}

export interface GardenLedgerReader {
  /** Cây của owner, trừ cây đang ẩn (nguồn ở Thùng rác). */
  visibleSubjectsOf(ownerId: string): Promise<GardenSubjectLedger[]>;
}
