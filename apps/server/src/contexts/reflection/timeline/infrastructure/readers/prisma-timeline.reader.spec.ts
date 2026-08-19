import { PrismaTimelineReader } from './prisma-timeline.reader';

describe('PrismaTimelineReader', () => {
  const reflectionTimelineEntry = {
    findMany: jest.fn(),
    count: jest.fn(),
  };
  const journalEntry = { findMany: jest.fn() };
  const memory = { findMany: jest.fn() };

  const prisma = {
    reflectionTimelineEntry,
    journalEntry,
    memory,
    $transaction: jest.fn(async (operations: Promise<unknown>[]) =>
      Promise.all(operations),
    ),
  };

  const reader = new PrismaTimelineReader(prisma as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('scopes and paginates the base query by owner', async () => {
    reflectionTimelineEntry.findMany.mockResolvedValue([]);
    reflectionTimelineEntry.count.mockResolvedValue(0);

    await reader.findAllForOwner('owner-1', { skip: 20, take: 10 });

    expect(reflectionTimelineEntry.findMany).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
      orderBy: [{ occurredOn: 'desc' }, { id: 'asc' }],
      skip: 20,
      take: 10,
    });
    expect(reflectionTimelineEntry.count).toHaveBeenCalledWith({
      where: { ownerId: 'owner-1' },
    });
  });

  it('resolves titles for both entry types in one batch query each', async () => {
    const occurredOnA = new Date('2026-08-18T00:00:00.000Z');
    const occurredOnB = new Date('2026-08-17T00:00:00.000Z');
    reflectionTimelineEntry.findMany.mockResolvedValue([
      {
        id: 't1',
        entryType: 'JOURNAL_SEALED',
        sourceId: 'journal-1',
        ownerId: 'owner-1',
        occurredOn: occurredOnA,
      },
      {
        id: 't2',
        entryType: 'MEMORY_CREATED',
        sourceId: 'memory-1',
        ownerId: 'owner-1',
        occurredOn: occurredOnB,
      },
    ]);
    reflectionTimelineEntry.count.mockResolvedValue(2);
    journalEntry.findMany.mockResolvedValue([
      { id: 'journal-1', title: 'A sealed entry' },
    ]);
    memory.findMany.mockResolvedValue([{ id: 'memory-1', title: 'A memory' }]);

    const result = await reader.findAllForOwner('owner-1', {
      skip: 0,
      take: 20,
    });

    expect(journalEntry.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['journal-1'] } },
      select: { id: true, title: true },
    });
    expect(memory.findMany).toHaveBeenCalledWith({
      where: { id: { in: ['memory-1'] } },
      select: { id: true, title: true },
    });
    expect(result.total).toBe(2);
    expect(result.entries).toEqual([
      {
        id: 't1',
        entryType: 'JOURNAL_SEALED',
        sourceId: 'journal-1',
        occurredOn: occurredOnA,
        title: 'A sealed entry',
        sourceExists: true,
      },
      {
        id: 't2',
        entryType: 'MEMORY_CREATED',
        sourceId: 'memory-1',
        occurredOn: occurredOnB,
        title: 'A memory',
        sourceExists: true,
      },
    ]);
  });

  it('marks entries whose source was permanently deleted, without leaking a stale title', async () => {
    reflectionTimelineEntry.findMany.mockResolvedValue([
      {
        id: 't1',
        entryType: 'JOURNAL_SEALED',
        sourceId: 'deleted-journal',
        ownerId: 'owner-1',
        occurredOn: new Date(),
      },
    ]);
    reflectionTimelineEntry.count.mockResolvedValue(1);
    journalEntry.findMany.mockResolvedValue([]);
    memory.findMany.mockResolvedValue([]);

    const result = await reader.findAllForOwner('owner-1', {
      skip: 0,
      take: 20,
    });

    expect(result.entries[0]).toMatchObject({
      title: null,
      sourceExists: false,
    });
  });

  it('skips the lookup query entirely when no entry of that type is present', async () => {
    reflectionTimelineEntry.findMany.mockResolvedValue([
      {
        id: 't1',
        entryType: 'JOURNAL_SEALED',
        sourceId: 'journal-1',
        ownerId: 'owner-1',
        occurredOn: new Date(),
      },
    ]);
    reflectionTimelineEntry.count.mockResolvedValue(1);
    journalEntry.findMany.mockResolvedValue([
      { id: 'journal-1', title: 'Title' },
    ]);

    await reader.findAllForOwner('owner-1', { skip: 0, take: 20 });

    expect(memory.findMany).not.toHaveBeenCalled();
  });
});
