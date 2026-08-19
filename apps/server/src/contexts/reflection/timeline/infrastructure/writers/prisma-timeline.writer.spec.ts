import { Prisma } from '@repo/database';

import { PrismaTimelineWriter } from './prisma-timeline.writer';

describe('PrismaTimelineWriter', () => {
  const reflectionTimelineEntry = {
    create: jest.fn(),
  };

  const prisma = {
    reflectionTimelineEntry,
  };

  const writer = new PrismaTimelineWriter(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const duplicateError = () =>
    new Prisma.PrismaClientKnownRequestError('duplicate', {
      code: 'P2002',
      clientVersion: 'test',
      meta: { target: ['entry_type', 'source_id'] },
    });

  describe('recordJournalSealed', () => {
    it('inserts a JOURNAL_SEALED entry scoped to the owner', async () => {
      reflectionTimelineEntry.create.mockResolvedValue(undefined);
      const sealedAt = new Date('2026-08-18T10:00:00.000Z');

      await writer.recordJournalSealed('owner-1', 'entry-1', sealedAt);

      expect(reflectionTimelineEntry.create).toHaveBeenCalledWith({
        data: {
          entryType: 'JOURNAL_SEALED',
          sourceId: 'entry-1',
          ownerId: 'owner-1',
          occurredOn: sealedAt,
        },
      });
    });

    it('treats a duplicate (entryType, sourceId) as already recorded', async () => {
      reflectionTimelineEntry.create.mockRejectedValue(duplicateError());

      await expect(
        writer.recordJournalSealed('owner-1', 'entry-1', new Date()),
      ).resolves.toBeUndefined();
    });

    it('rethrows errors that are not a unique constraint violation', async () => {
      const unexpected = new Error('connection lost');
      reflectionTimelineEntry.create.mockRejectedValue(unexpected);

      await expect(
        writer.recordJournalSealed('owner-1', 'entry-1', new Date()),
      ).rejects.toBe(unexpected);
    });
  });

  describe('recordMemoryCreated', () => {
    it('inserts a MEMORY_CREATED entry using the Memory occurrence date', async () => {
      reflectionTimelineEntry.create.mockResolvedValue(undefined);
      const occurredOn = new Date('2024-08-01T00:00:00.000Z');

      await writer.recordMemoryCreated('owner-1', 'memory-1', occurredOn);

      expect(reflectionTimelineEntry.create).toHaveBeenCalledWith({
        data: {
          entryType: 'MEMORY_CREATED',
          sourceId: 'memory-1',
          ownerId: 'owner-1',
          occurredOn,
        },
      });
    });

    it('falls back to the current time when the Memory occurrence date is unknown', async () => {
      reflectionTimelineEntry.create.mockResolvedValue(undefined);

      await writer.recordMemoryCreated('owner-1', 'memory-1', null);

      expect(reflectionTimelineEntry.create).toHaveBeenCalledWith({
        data: {
          entryType: 'MEMORY_CREATED',
          sourceId: 'memory-1',
          ownerId: 'owner-1',
          occurredOn: expect.any(Date),
        },
      });
    });

    it('treats a duplicate (entryType, sourceId) as already recorded', async () => {
      reflectionTimelineEntry.create.mockRejectedValue(duplicateError());

      await expect(
        writer.recordMemoryCreated('owner-1', 'memory-1', null),
      ).resolves.toBeUndefined();
    });
  });
});
