import {
  JournalEntry as PrismaJournalEntry,
  JournalEntryState as PrismaJournalEntryState,
} from '@repo/database';

import { JournalEntryState } from '../../domain/enums';
import { PrismaJournalEntryMapper } from './prisma-journal-entry.mapper';

describe('PrismaJournalEntryMapper', () => {
  const createdAt = new Date('2026-08-01T00:00:00.000Z');
  const updatedAt = new Date('2026-08-02T00:00:00.000Z');
  const trashedAt = new Date('2026-08-03T00:00:00.000Z');

  const raw: PrismaJournalEntry = {
    id: 'entry-1',
    ownerId: 'owner-1',
    title: 'Private thought',
    content: 'Journal content',
    state: PrismaJournalEntryState.TRASHED,
    stateBeforeTrash: PrismaJournalEntryState.SEALED,
    revision: 4,
    trashedAt,
    createdAt,
    updatedAt,
  };

  it('maps a Prisma record to the domain aggregate', () => {
    const entry = PrismaJournalEntryMapper.toDomain(raw);

    expect(entry.toPrimitives()).toEqual({
      id: 'entry-1',
      ownerId: 'owner-1',
      title: 'Private thought',
      content: 'Journal content',
      state: JournalEntryState.TRASHED,
      stateBeforeTrash: JournalEntryState.SEALED,
      revision: 4,
      trashedAt,
      createdAt,
      updatedAt,
    });

    expect(entry.getDomainEvents()).toEqual([]);
  });

  it('maps the domain aggregate back to persistence', () => {
    const entry = PrismaJournalEntryMapper.toDomain(raw);

    expect(PrismaJournalEntryMapper.toPersistence(entry)).toEqual(raw);
  });
});
