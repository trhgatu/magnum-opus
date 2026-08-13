import {
  Memory as PrismaMemory,
  MemoryDatePrecision as PrismaMemoryDatePrecision,
  MemoryState as PrismaMemoryState,
} from '@repo/database';

import { MemoryDatePrecision, MemoryState } from '../../domain/enums';
import { Memory, type MemoryProps } from '../../domain/memory.aggregate';
import { MemoryId, MemoryOccurredOn } from '../../domain/value-objects';

import { PrismaMemoryRepository } from './prisma-memory.repository';

describe('PrismaMemoryRepository', () => {
  const memory = {
    create: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
    findMany: jest.fn(),
    count: jest.fn(),
    deleteMany: jest.fn(),
  };

  const prisma = {
    memory,
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };

  const repository = new PrismaMemoryRepository(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('create', () => {
    it('persists the complete aggregate state', async () => {
      memory.create.mockResolvedValue(rawMemory());

      const aggregate = createDomainMemory();

      await repository.create(aggregate);

      expect(memory.create).toHaveBeenCalledWith({
        data: {
          ...aggregate.toPrimitives(),
          occurredOn: new Date('2024-08-01T00:00:00.000Z'),
          occurredOnPrecision: PrismaMemoryDatePrecision.MONTH,
          state: PrismaMemoryState.ACTIVE,
        },
      });
    });
  });

  describe('update', () => {
    it('updates only the owned Memory at the expected revision', async () => {
      memory.updateMany.mockResolvedValue({
        count: 1,
      });

      const aggregate = createDomainMemory();

      aggregate.update({
        title: 'Updated title',
        content: 'Updated content',
        occurredOn: MemoryOccurredOn.fromYear(2018),
      });

      const updated = await repository.update(aggregate, 1);

      expect(updated).toBe(true);
      expect(memory.updateMany).toHaveBeenCalledWith({
        where: {
          id: 'memory-id',
          ownerId: 'owner-id',
          revision: 1,
        },
        data: {
          title: 'Updated title',
          content: 'Updated content',
          occurredOn: new Date('2018-01-01T00:00:00.000Z'),
          occurredOnPrecision: PrismaMemoryDatePrecision.YEAR,
          state: PrismaMemoryState.ACTIVE,
          revision: 2,
          trashedAt: null,
          updatedAt: aggregate.updatedAt,
        },
      });
    });

    it('returns false when the expected revision is stale', async () => {
      memory.updateMany.mockResolvedValue({
        count: 0,
      });

      const aggregate = createDomainMemory();

      aggregate.update({
        title: 'Updated title',
        content: 'Updated content',
        occurredOn: MemoryOccurredOn.unknown(),
      });

      const updated = await repository.update(aggregate, 1);

      expect(updated).toBe(false);
    });
  });

  describe('findByIdForOwner', () => {
    it('scopes lookup by Memory ID and owner ID', async () => {
      memory.findFirst.mockResolvedValue(rawMemory());

      const aggregate = await repository.findByIdForOwner(
        'memory-id',
        'owner-id',
      );

      expect(memory.findFirst).toHaveBeenCalledWith({
        where: {
          id: 'memory-id',
          ownerId: 'owner-id',
        },
      });

      expect(aggregate?.id).toBe('memory-id');
      expect(aggregate?.ownerId).toBe('owner-id');
    });

    it('returns null when no owned Memory exists', async () => {
      memory.findFirst.mockResolvedValue(null);

      const aggregate = await repository.findByIdForOwner(
        'memory-id',
        'different-owner',
      );

      expect(aggregate).toBeNull();
    });
  });

  describe('findAllForOwner', () => {
    it('applies ownership, state, search and pagination', async () => {
      memory.findMany.mockResolvedValue([rawMemory()]);
      memory.count.mockResolvedValue(1);

      const result = await repository.findAllForOwner('owner-id', {
        skip: 10,
        take: 5,
        state: MemoryState.TRASHED,
        search: ' rain ',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      });

      const expectedWhere = {
        ownerId: 'owner-id',
        state: PrismaMemoryState.TRASHED,
        OR: [
          {
            title: {
              contains: 'rain',
              mode: 'insensitive',
            },
          },
          {
            content: {
              contains: 'rain',
              mode: 'insensitive',
            },
          },
        ],
      };

      expect(memory.findMany).toHaveBeenCalledWith({
        where: expectedWhere,
        orderBy: [
          {
            createdAt: 'asc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 10,
        take: 5,
      });

      expect(memory.count).toHaveBeenCalledWith({
        where: expectedWhere,
      });

      expect(prisma.$transaction).toHaveBeenCalledTimes(1);
      expect(result.total).toBe(1);
      expect(result.memories).toHaveLength(1);
      expect(result.memories[0]?.id).toBe('memory-id');
    });

    it('defaults to active Memories and updated time', async () => {
      memory.findMany.mockResolvedValue([]);
      memory.count.mockResolvedValue(0);

      await repository.findAllForOwner('owner-id', {
        skip: 0,
        take: 10,
        search: '   ',
      });

      expect(memory.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'owner-id',
          state: PrismaMemoryState.ACTIVE,
        },
        orderBy: [
          {
            updatedAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
      });
    });

    it('places unknown dates last in Timeline sorting', async () => {
      memory.findMany.mockResolvedValue([]);
      memory.count.mockResolvedValue(0);

      await repository.findAllForOwner('owner-id', {
        skip: 0,
        take: 10,
        sortBy: 'occurredOn',
        sortOrder: 'desc',
      });

      expect(memory.findMany).toHaveBeenCalledWith({
        where: {
          ownerId: 'owner-id',
          state: PrismaMemoryState.ACTIVE,
        },
        orderBy: [
          {
            occurredOn: {
              sort: 'desc',
              nulls: 'last',
            },
          },
          {
            createdAt: 'desc',
          },
          {
            id: 'asc',
          },
        ],
        skip: 0,
        take: 10,
      });
    });
  });

  describe('deletePermanently', () => {
    it('deletes only an owned trashed Memory at the expected revision', async () => {
      memory.deleteMany.mockResolvedValue({
        count: 1,
      });

      const deleted = await repository.deletePermanently(
        'memory-id',
        'owner-id',
        4,
      );

      expect(deleted).toBe(true);
      expect(memory.deleteMany).toHaveBeenCalledWith({
        where: {
          id: 'memory-id',
          ownerId: 'owner-id',
          revision: 4,
          state: PrismaMemoryState.TRASHED,
        },
      });
    });

    it('returns false when nothing matches all delete conditions', async () => {
      memory.deleteMany.mockResolvedValue({
        count: 0,
      });

      const deleted = await repository.deletePermanently(
        'memory-id',
        'owner-id',
        3,
      );

      expect(deleted).toBe(false);
    });
  });
});

function createDomainMemory(): Memory {
  return Memory.rehydrate(createProps());
}

function createProps(overrides: Partial<MemoryProps> = {}): MemoryProps {
  const timestamp = new Date('2026-08-01T10:00:00.000Z');

  return {
    id: new MemoryId('memory-id'),
    ownerId: 'owner-id',
    sourceJournalEntryId: 'journal-id',
    title: 'The rainy construction site',
    content: 'I felt completely still.',
    occurredOn: MemoryOccurredOn.fromMonth(2024, 8),
    state: MemoryState.ACTIVE,
    revision: 1,
    trashedAt: null,
    createdAt: timestamp,
    updatedAt: timestamp,
    ...overrides,
  };
}

function rawMemory(): PrismaMemory {
  return {
    id: 'memory-id',
    ownerId: 'owner-id',
    sourceJournalEntryId: 'journal-id',
    title: 'The rainy construction site',
    content: 'I felt completely still.',
    occurredOn: new Date('2024-08-01T00:00:00.000Z'),
    occurredOnPrecision: PrismaMemoryDatePrecision.MONTH,
    state: PrismaMemoryState.ACTIVE,
    revision: 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T10:00:00.000Z'),
    updatedAt: new Date('2026-08-01T10:00:00.000Z'),
  };
}
