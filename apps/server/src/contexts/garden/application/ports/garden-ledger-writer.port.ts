import type {
  GardenSubjectKind,
  GardenVariant,
} from '../../domain/garden-subject';

export const GARDEN_LEDGER_WRITER = Symbol('GARDEN_LEDGER_WRITER');

export interface PlantedSubject {
  ownerId: string;
  subjectKind: GardenSubjectKind;
  subjectId: string;
  variant: GardenVariant;
  nameAtPlanting: string;
  plantedOn: Date;
}

export interface GardenLedgerWriter {
  plant(subject: PlantedSubject): Promise<void>;
  uproot(subjectKind: GardenSubjectKind, subjectId: string): Promise<void>;
}
