import { PrismaJournalListReader } from './prisma-journal-list.reader';

describe('PrismaJournalListReader', () => {
  const mood = { findMany: jest.fn() };
  const memory = { groupBy: jest.fn() };
  const $queryRaw = jest.fn();
  const reader = new PrismaJournalListReader({
    mood,
    memory,
    $queryRaw,
  } as never);

  beforeEach(() => jest.clearAllMocks());

  it('pairs each listed entry with its mood and active memory count', async () => {
    mood.findMany.mockResolvedValue([
      { journalEntryId: 'entry-1', label: 'CALM' },
    ]);
    memory.groupBy.mockResolvedValue([
      { sourceJournalEntryId: 'entry-2', _count: { _all: 3 } },
    ]);

    const extras = await reader.extrasFor('owner-1', ['entry-1', 'entry-2']);

    expect([...extras]).toEqual([
      ['entry-1', { mood: 'CALM', memoryCount: 0 }],
      ['entry-2', { mood: null, memoryCount: 3 }],
    ]);
    expect(mood.findMany).toHaveBeenCalledWith({
      where: {
        journalEntryId: { in: ['entry-1', 'entry-2'] },
        journalEntry: { ownerId: 'owner-1' },
      },
      select: { journalEntryId: true, label: true },
    });
    expect(memory.groupBy).toHaveBeenCalledWith({
      by: ['sourceJournalEntryId'],
      where: {
        ownerId: 'owner-1',
        state: 'ACTIVE',
        sourceJournalEntryId: { in: ['entry-1', 'entry-2'] },
      },
      _count: { _all: true },
    });
  });

  it('reads nothing for an empty page', async () => {
    await expect(reader.extrasFor('owner-1', [])).resolves.toEqual(new Map());
    expect(mood.findMany).not.toHaveBeenCalled();
    expect(memory.groupBy).not.toHaveBeenCalled();
  });

  it('returns the written day count as a number', async () => {
    $queryRaw.mockResolvedValue([{ days: 5n }]);

    await expect(
      reader.writtenDaysLast7('owner-1', new Date('2026-11-25T03:00:00Z')),
    ).resolves.toBe(5);
  });
});
