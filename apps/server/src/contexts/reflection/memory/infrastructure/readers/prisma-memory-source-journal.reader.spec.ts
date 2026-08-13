import { JournalEntryState } from '@repo/database';

import { MemorySourceJournalStatus } from '../../application/ports/memory-source-journal-reader.port';
import { PrismaMemorySourceJournalReader } from './prisma-memory-source-journal.reader';

describe('PrismaMemorySourceJournalReader', () => {
  const journalEntry = {
    findFirst: jest.fn(),
  };
  const reader = new PrismaMemorySourceJournalReader({ journalEntry } as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('scopes the source lookup by Journal ID and owner ID', async () => {
    journalEntry.findFirst.mockResolvedValue({
      state: JournalEntryState.DRAFT,
    });

    const status = await reader.getStatusForOwner('journal-1', 'owner-1');

    expect(journalEntry.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'journal-1',
        ownerId: 'owner-1',
      },
      select: {
        state: true,
      },
    });
    expect(status).toBe(MemorySourceJournalStatus.AVAILABLE);
  });

  it('hides a missing or differently owned Journal entry as not found', async () => {
    journalEntry.findFirst.mockResolvedValue(null);

    await expect(
      reader.getStatusForOwner('journal-1', 'owner-1'),
    ).resolves.toBe(MemorySourceJournalStatus.NOT_FOUND);
  });

  it.each([JournalEntryState.DRAFT, JournalEntryState.SEALED])(
    'maps %s to an available Memory source',
    async (state) => {
      journalEntry.findFirst.mockResolvedValue({ state });

      await expect(
        reader.getStatusForOwner('journal-1', 'owner-1'),
      ).resolves.toBe(MemorySourceJournalStatus.AVAILABLE);
    },
  );

  it('maps a trashed Journal entry without exposing its state to application code', async () => {
    journalEntry.findFirst.mockResolvedValue({
      state: JournalEntryState.TRASHED,
    });

    await expect(
      reader.getStatusForOwner('journal-1', 'owner-1'),
    ).resolves.toBe(MemorySourceJournalStatus.TRASHED);
  });
});
