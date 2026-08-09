import {
  JournalEntry as PrismaJournalEntry,
  JournalEntryState as PrismaJournalEntryState,
} from '@repo/database';

import { JournalEntryState } from '../../domain/enums';
import { JournalEntry } from '../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../domain/value-objects';

export class PrismaJournalEntryMapper {
  public static toDomain(raw: PrismaJournalEntry): JournalEntry {
    return JournalEntry.rehydrate({
      id: new JournalEntryId(raw.id),
      ownerId: raw.ownerId,
      title: raw.title,
      content: raw.content,
      state: this.toDomainState(raw.state),
      stateBeforeTrash: raw.stateBeforeTrash
        ? this.toDomainState(raw.stateBeforeTrash)
        : null,
      revision: raw.revision,
      trashedAt: raw.trashedAt,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(entry: JournalEntry): PrismaJournalEntry {
    const props = entry.toPrimitives();

    return {
      id: props.id,
      ownerId: props.ownerId,
      title: props.title,
      content: props.content,
      state: this.toPersistenceState(props.state),
      stateBeforeTrash: props.stateBeforeTrash
        ? this.toPersistenceState(props.stateBeforeTrash)
        : null,
      revision: props.revision,
      trashedAt: props.trashedAt,
      createdAt: props.createdAt,
      updatedAt: props.updatedAt,
    };
  }

  private static toDomainState(
    state: PrismaJournalEntryState,
  ): JournalEntryState {
    return state as JournalEntryState;
  }

  private static toPersistenceState(
    state: JournalEntryState,
  ): PrismaJournalEntryState {
    return state as PrismaJournalEntryState;
  }
}
