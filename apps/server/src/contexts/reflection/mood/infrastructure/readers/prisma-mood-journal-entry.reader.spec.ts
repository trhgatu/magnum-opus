import { JournalEntryState } from '@repo/database';

import { MoodJournalEntryAccessStatus } from '../../application/ports/mood-journal-entry-reader.port';
import { PrismaMoodJournalEntryReader } from './prisma-mood-journal-entry.reader';

describe('PrismaMoodJournalEntryReader', () => {
  const journalEntry = {
    findFirst: jest.fn(),
  };
  const reader = new PrismaMoodJournalEntryReader({ journalEntry } as never);

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('scopes access by Journal ID and owner ID', async () => {
    journalEntry.findFirst.mockResolvedValue({
      state: JournalEntryState.DRAFT,
    });

    const access = await reader.getAccessForOwner('entry-1', 'owner-1');

    expect(journalEntry.findFirst).toHaveBeenCalledWith({
      where: {
        id: 'entry-1',
        ownerId: 'owner-1',
      },
      select: {
        state: true,
      },
    });
    expect(access).toEqual({
      status: MoodJournalEntryAccessStatus.EDITABLE,
    });
  });

  it('hides a missing or differently owned Journal entry as not found', async () => {
    journalEntry.findFirst.mockResolvedValue(null);

    await expect(
      reader.getAccessForOwner('entry-1', 'owner-1'),
    ).resolves.toEqual({
      status: MoodJournalEntryAccessStatus.NOT_FOUND,
    });
  });

  it.each([JournalEntryState.SEALED, JournalEntryState.TRASHED])(
    'maps %s to non-editable access while preserving diagnostic state',
    async (state) => {
      journalEntry.findFirst.mockResolvedValue({ state });

      await expect(
        reader.getAccessForOwner('entry-1', 'owner-1'),
      ).resolves.toEqual({
        status: MoodJournalEntryAccessStatus.NOT_EDITABLE,
        state,
      });
    },
  );
});
