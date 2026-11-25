import type {
  GardenSubjectKind,
  GardenVariant,
} from '../../domain/garden-subject';
import {
  GardenEntryKind,
  GardenMark,
  GardenSchedule,
} from '../../domain/garden-entry';

import type { GardenDatePrecision } from '../../domain/garden-lantern';

export const GARDEN_LEDGER_WRITER = Symbol('GARDEN_LEDGER_WRITER');

export interface PlantedSubject {
  ownerId: string;
  subjectKind: GardenSubjectKind;
  subjectId: string;
  variant: GardenVariant;
  nameAtPlanting: string;
  plantedOn: Date;
}

export type LedgerEntry = {
  subjectKind: GardenSubjectKind;
  subjectId: string;
  occurredOn: Date;
  sourceEventId: string;
} & (
  | {
      kind: Exclude<GardenEntryKind, 'MARKED' | 'RHYTHM_SET' | 'REFLECTED'>;
      mark?: never;
      detail?: never;
    }
  | { kind: 'MARKED'; mark: GardenMark; detail?: never }
  | { kind: 'RHYTHM_SET'; detail: GardenSchedule; mark?: never }
);

export interface GardenLedgerWriter {
  plant(subject: PlantedSubject): Promise<void>;
  uproot(subjectKind: GardenSubjectKind, subjectId: string): Promise<void>;
  record(entry: LedgerEntry): Promise<void>;
  replant(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    plantedOn: Date,
  ): Promise<void>;
  hide(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    hiddenAt: Date,
  ): Promise<void>;
  show(subjectKind: GardenSubjectKind, subjectId: string): Promise<void>;
  rename(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    name: string,
  ): Promise<void>;
  assignBed(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    bed: { id: string; name: string },
  ): Promise<void>;
  recordReflection(entry: {
    ownerId: string;
    sourceRef: string;
    occurredOn: Date;
    sourceEventId: string;
  }): Promise<void>;
  hangLantern(lantern: {
    ownerId: string;
    memoryId: string;
    occurredOn: Date | null;
    precision: GardenDatePrecision;
  }): Promise<void>;
  /** Dời đèn; chưa có đèn (vd ký ức tạo lúc deploy) thì treo luôn. */
  moveLantern(lantern: {
    ownerId: string;
    memoryId: string;
    occurredOn: Date | null;
    precision: GardenDatePrecision;
  }): Promise<void>;
  hideLantern(memoryId: string, hiddenAt: Date): Promise<void>;
  showLantern(memoryId: string): Promise<void>;
  removeLantern(memoryId: string): Promise<void>;
}
