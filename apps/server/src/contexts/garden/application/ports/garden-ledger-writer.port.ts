import type {
  GardenSubjectKind,
  GardenVariant,
} from '../../domain/garden-subject';
import { GardenEntryKind, GardenMark } from '../../domain/garden-entry';

export const GARDEN_LEDGER_WRITER = Symbol('GARDEN_LEDGER_WRITER');

export interface PlantedSubject {
  ownerId: string;
  subjectKind: GardenSubjectKind;
  subjectId: string;
  variant: GardenVariant;
  nameAtPlanting: string;
  plantedOn: Date;
}

export interface LedgerEntry {
  subjectKind: GardenSubjectKind;
  subjectId: string;
  kind: GardenEntryKind;
  mark?: GardenMark;
  occurredOn: Date;
  sourceEventId: string;
}

export interface GardenLedgerWriter {
  plant(subject: PlantedSubject): Promise<void>;
  uproot(subjectKind: GardenSubjectKind, subjectId: string): Promise<void>;
  record(entry: LedgerEntry): Promise<void>;
  replant(
    subjectKind: GardenSubjectKind,
    subjectId: string,
    plantedOn: Date,
  ): Promise<void>;
}
