import { JournalEntryState } from '@/contexts/reflection/journal/domain/enums';
import { JournalEntryNotFoundException } from '@/contexts/reflection/journal/domain/exceptions';
import { JournalEntry } from '@/contexts/reflection/journal/domain/journal-entry.aggregate';
import { JournalEntryId } from '@/contexts/reflection/journal/domain/value-objects';

import { MoodLabel } from '../../../domain/enums';
import { Mood } from '../../../domain/mood.aggregate';
import { MoodId } from '../../../domain/value-objects';
import { GetMoodQuery } from '../get-mood.query';
import { GetMoodHandler } from './get-mood.handler';

describe('GetMoodHandler', () => {
  const journalEntryRepository = {
    findByIdForOwner: jest.fn(),
  };
  const moodRepository = {
    findByJournalEntryIdForOwner: jest.fn(),
  };
  const handler = new GetMoodHandler(
    journalEntryRepository as never,
    moodRepository as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('returns the Mood for an owned Journal entry', async () => {
    const mood = createMood();
    journalEntryRepository.findByIdForOwner.mockResolvedValue(
      createJournalEntry(),
    );
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(mood);

    const result = await handler.execute(
      new GetMoodQuery('entry-1', 'owner-1'),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(mood);
  });

  it('returns null when the owned Journal entry has no Mood', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(
      createJournalEntry(),
    );
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetMoodQuery('entry-1', 'owner-1'),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('returns not found before looking up Mood when the entry is not owned', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetMoodQuery('entry-1', 'different-owner'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(JournalEntryNotFoundException);
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });
});

function createJournalEntry(): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: null,
    content: '',
    state: JournalEntryState.DRAFT,
    stateBeforeTrash: null,
    revision: 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}

function createMood(): Mood {
  return Mood.rehydrate({
    id: new MoodId('mood-1'),
    journalEntryId: 'entry-1',
    label: MoodLabel.CALM,
    intensity: 3,
    note: null,
    revision: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
