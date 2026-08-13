import { MoodLabel } from '../../../domain/enums';
import {
  MoodJournalEntryNotEditableException,
  MoodJournalEntryNotFoundException,
  MoodNotFoundException,
  MoodRevisionConflictException,
} from '../../../domain/exceptions';
import { Mood } from '../../../domain/mood.aggregate';
import { MoodId } from '../../../domain/value-objects';
import { MoodJournalEntryAccessStatus } from '../../ports/mood-journal-entry-reader.port';
import { RemoveMoodCommand } from '../remove-mood.command';
import { RemoveMoodHandler } from './remove-mood.handler';

describe('RemoveMoodHandler', () => {
  const journalEntryReader = {
    getAccessForOwner: jest.fn(),
  };
  const moodRepository = {
    findByJournalEntryIdForOwner: jest.fn(),
    deleteByJournalEntryIdForOwner: jest.fn(),
  };
  const handler = new RemoveMoodHandler(
    journalEntryReader as never,
    moodRepository as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('removes an owned Mood at the expected revision', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(createMood());
    moodRepository.deleteByJournalEntryIdForOwner.mockResolvedValue(true);

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.isSuccess).toBe(true);
    expect(moodRepository.deleteByJournalEntryIdForOwner).toHaveBeenCalledWith(
      'entry-1',
      'owner-1',
      1,
    );
  });

  it('returns not found when the owned Journal entry does not exist', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue({
      status: MoodJournalEntryAccessStatus.NOT_FOUND,
    });

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(MoodJournalEntryNotFoundException);
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });

  it('rejects removal when the Journal entry is not a Draft', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue({
      status: MoodJournalEntryAccessStatus.NOT_EDITABLE,
      state: 'SEALED',
    });

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(
      MoodJournalEntryNotEditableException,
    );
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });

  it('returns Mood not found when the Draft has no Mood', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(MoodNotFoundException);
  });

  it('rejects a stale revision before deleting', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(createMood());

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 9),
    );

    expect(result.getError()).toBeInstanceOf(MoodRevisionConflictException);
    expect(
      moodRepository.deleteByJournalEntryIdForOwner,
    ).not.toHaveBeenCalled();
  });

  it('returns conflict when another request changes the Mood before deletion', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(createMood());
    moodRepository.deleteByJournalEntryIdForOwner.mockResolvedValue(false);

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(MoodRevisionConflictException);
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
