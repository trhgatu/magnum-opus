import { MoodLabel } from '../../../domain/enums';
import { MoodJournalEntryNotFoundException } from '../../../domain/exceptions';
import { Mood } from '../../../domain/mood.aggregate';
import { MoodId } from '../../../domain/value-objects';
import { MoodJournalEntryAccessStatus } from '../../ports/mood-journal-entry-reader.port';
import { GetMoodQuery } from '../get-mood.query';
import { GetMoodHandler } from './get-mood.handler';

describe('GetMoodHandler', () => {
  const journalEntryReader = {
    getAccessForOwner: jest.fn(),
  };
  const moodRepository = {
    findByJournalEntryIdForOwner: jest.fn(),
  };
  const handler = new GetMoodHandler(
    journalEntryReader as never,
    moodRepository as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('returns the Mood for an owned Journal entry', async () => {
    const mood = createMood();
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(mood);

    const result = await handler.execute(
      new GetMoodQuery('entry-1', 'owner-1'),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(mood);
  });

  it('returns null when the owned Journal entry has no Mood', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetMoodQuery('entry-1', 'owner-1'),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeNull();
  });

  it('returns not found before looking up Mood when the entry is not owned', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue({
      status: MoodJournalEntryAccessStatus.NOT_FOUND,
    });

    const result = await handler.execute(
      new GetMoodQuery('entry-1', 'different-owner'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(MoodJournalEntryNotFoundException);
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });
});

function editableAccess() {
  return { status: MoodJournalEntryAccessStatus.EDITABLE } as const;
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
