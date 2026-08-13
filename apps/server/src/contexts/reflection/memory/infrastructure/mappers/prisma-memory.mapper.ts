import {
  Memory as PrismaMemory,
  MemoryDatePrecision as PrismaMemoryDatePrecistion,
  MemoryState as PrismaMemoryState,
} from '@repo/database';

import { MemoryDatePrecision, MemoryState } from '../../domain/enums';
import { Memory } from '../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../domain/value-objects';

const domainStates: Record<PrismaMemoryState, MemoryState> = {
  [PrismaMemoryState.ACTIVE]: MemoryState.ACTIVE,
  [PrismaMemoryState.TRASHED]: MemoryState.TRASHED,
};

const persistenceStates: Record<MemoryState, PrismaMemoryState> = {
  [MemoryState.ACTIVE]: PrismaMemoryState.ACTIVE,
  [MemoryState.TRASHED]: PrismaMemoryState.TRASHED,
};

const domainPrecisions: Record<
  PrismaMemoryDatePrecistion,
  MemoryDatePrecision
> = {
  [PrismaMemoryDatePrecistion.DAY]: MemoryDatePrecision.DAY,
  [PrismaMemoryDatePrecistion.MONTH]: MemoryDatePrecision.MONTH,
  [PrismaMemoryDatePrecistion.YEAR]: MemoryDatePrecision.YEAR,
  [PrismaMemoryDatePrecistion.UNKNOWN]: MemoryDatePrecision.UNKNOWN,
};

const persistencePrecisions: Record<
  MemoryDatePrecision,
  PrismaMemoryDatePrecistion
> = {
  [MemoryDatePrecision.DAY]: PrismaMemoryDatePrecistion.DAY,
  [MemoryDatePrecision.MONTH]: PrismaMemoryDatePrecistion.MONTH,
  [MemoryDatePrecision.YEAR]: PrismaMemoryDatePrecistion.YEAR,
  [MemoryDatePrecision.UNKNOWN]: PrismaMemoryDatePrecistion.UNKNOWN,
};

export class PrismaMemoryMapper {
  public static toDomain(raw: PrismaMemory): Memory {
    const precision = domainPrecisions[raw.occurredOnPrecision];

    return Memory.rehydrate({
      id: new MemoryId(raw.id),
      ownerId: raw.ownerId,
      sourceJournalEntryId: raw.sourceJournalEntryId,
      title: raw.title,
      content: raw.content,
      occurredOn: MemoryOccurredOn.rehydrate(
        this.dateToIso(raw.occurredOn),
        precision,
      ),
      state: domainStates[raw.state],
      revision: raw.revision,
      trashedAt: raw.trashedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(memory: Memory): PrismaMemory {
    const props = memory.toPrimitives();

    return {
      id: props.id,
      ownerId: props.ownerId,
      sourceJournalEntryId: props.sourceJournalEntryId,
      title: props.title,
      content: props.content,
      occurredOn: this.isoToDate(props.occurredOn),
      occurredOnPrecision: persistencePrecisions[props.occurredOnPrecision],
      state: persistenceStates[props.state],
      revision: props.revision,
      trashedAt: props.trashedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }
  private static dateToIso(date: Date | null): string | null {
    if (date === null) {
      return null;
    }

    const year = date.getUTCFullYear().toString().padStart(4, '0');
    const month = (date.getUTCMonth() + 1).toString().padStart(2, '0');
    const day = date.getUTCDate().toString().padStart(2, '0');

    return `${year}-${month}-${day}`;
  }

  private static isoToDate(value: string | null): Date | null {
    if (value === null) {
      return null;
    }

    return new Date(`${value}T00:00:00.000Z`);
  }
}
