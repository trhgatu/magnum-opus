import {
  JournalEntry as PrismaJournalEntry,
  JournalEntryState as PrismaJournalEntryState,
} from '@repo/database';

import { JournalEntryState } from '../../domain/enums';
import { JournalEntry } from '../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../domain/value-objects';
import { PrismaJournalEntryRepository } from './prisma-journal-entry.repository';

describe('PrismaJournalEntryRepository', () => {
  const journalEntry = {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  };

  const prisma = {
    journalEntry,
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };

  const repository = new PrismaJournalEntryRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('persists the complete aggregate state', async () => {
      journalEntry.create.mockResolvedValue(rawEntry());

      const entry = createDomainEntry();

      await repository.create(entry);

      expect(journalEntry.create).toHaveBeenCalledWith({
        data: entry.toPrimitives(),
      });
    });
  });

  describe('update', () => {
    it('updates only the owned entry at the expected revision', async () => {
      journalEntry.updateMany.mockResolvedValue({ count: 1 });

      const entry = createDomainEntry();
      entry.updateContent({
        title: 'Updated title',
        content: 'Updated content',
      });

      const updated = await repository.update(entry, 1);

      expect(updated).toBe(true);
      expect(journalEntry.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'entry-1',
          ownerId: 'owner-1',
          revision: 1,
        },
        data: {
          title: 'Updated title',
          content: 'Updated content',
          state: PrismaJournalEntryState.DRAFT,
          stateBeforeTrash: null,
          revision: 2,
          trashedAt: null,
          updatedAt: entry.updatedAt,
        },
      });
    });

    it('returns false when the expected revision is stale', async () => {
      journalEntry.updateMany.mockResolvedValue({ count: 0 });

      const entry = createDomainEntry();
      entry.updateContent({
        title: 'Updated title',
        content: 'Updated content',
      });

      const updated = await repository.update(entry, 1);

      expect(updated).toBe(false);
    });
  });

  describe('findByIdForOwner', () => {
    it('scopes the lookup by both entry ID and owner ID', async () => {
      journalEntry.findFirst.mockResolvedValue(rawEntry());

      const entry = await repository.findByIdForOwner('entry-1', 'owner-1');

      expect(journalEntry.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'entry-1',
          ownerId: 'owner-1',
        },
      });

      expect(entry?.id).toBe('entry-1');
      expect(entry?.ownerId).toBe('owner-1');
    });

    it('returns null when no owned entry exists', async () => {
      journalEntry.findFirst.mockResolvedValue(null);

      const entry = await repository.findByIdForOwner(
        'entry-1',
        'different-owner',
      );

      expect(entry).toBeNull();
    });
  });

  describe('findAllForOwner', () => {
    it('applies ownership, state, search, sorting and pagination', async () => {
      journalEntry.findMany.mockResolvedValue([rawEntry()]);
      journalEntry.count.mockResolvedValue(1);

      const result = await repository.findAllForOwner('owner-1', {
        skip: 10,
        take: 5,
        state: JournalEntryState.DRAFT,
        search: ' private ',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      const expectedWhere = {
        ownerId: 'owner-1',
        state: PrismaJournalEntryState.DRAFT,
        OR: [
          {
            title: {
              contains: 'private',
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: 'private',
              mode: 'insensitive',
            },
          },
        ],
      };

      expect(journalEntry.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: {
          createdAt: 'asc',
        },
        skip: 10,
        take: 5,
      });

      expect(journalEntry.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect(result.entries).toHaveLength(1);
      expect(result.entries[0]?.id).toBe('entry-1');
    });

    it('uses default sorting and ignores blank search text', async () => {
      journalEntry.findMany.mockResolvedValue([]);
      journalEntry.count.mockResolvedValue(0);

      await repository.findAllForOwner('owner-1', {
        skip: 0,
        take: 10,
        search: '   ',
      });

      expect(journalEntry.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'owner-1',
        },
        orderBy: {
          updatedAt: 'desc',
        },
        skip: 0,
        take: 10,
      });
    });
  });

  describe('deletePermanently', () => {
    it('deletes only an owned trashed entry at the expected revision', async () => {
      journalEntry.deleteMany.mockResolvedValue({ count: 1 });

      const deleted = await repository.deletePermanently(
        'entry-1',
        'owner-1',
        4,
      );

      expect(deleted).toBe(true);
      expect(journalEntry.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'entry-1',
          ownerId: 'owner-1',
          revision: 4,
          state: PrismaJournalEntryState.TRASHED,
        },
      });
    });

    it('returns false when nothing matches all delete conditions', async () => {
      journalEntry.deleteMany.mockResolvedValue({ count: 0 });

      const deleted = await repository.deletePermanently(
        'entry-1',
        'owner-1',
        3,
      );

      expect(deleted).toBe(false);
    });
  });
});

function createDomainEntry(): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: 'Private thought',
    content: 'Original content',
    state: JournalEntryState.DRAFT,
    stateBeforeTrash: null,
    revision: 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}

function rawEntry(): PrismaJournalEntry {
  return {
    id: 'entry-1',
    ownerId: 'owner-1',
    title: 'Private thought',
    content: 'Original content',
    state: PrismaJournalEntryState.DRAFT,
    stateBeforeTrash: null,
    revision: 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  };
}
