import { JournalEntryState } from '@/contexts/reflection/journal/domain/enums';
import { JournalEntryNotFoundException } from '@/contexts/reflection/journal/domain/exceptions';
import { JournalEntry } from '@/contexts/reflection/journal/domain/journal-entry.aggregate';
import { JournalEntryId } from '@/contexts/reflection/journal/domain/value-objects';

import { MoodLabel } from '../../../domain/enums';
import {
  MoodJournalEntryNotEditableException,
  MoodNotFoundException,
  MoodRevisionConflictException,
} from '../../../domain/exceptions';
import { Mood } from '../../../domain/mood.aggregate';
import { MoodId } from '../../../domain/value-objects';
import { RemoveMoodCommand } from '../remove-mood.command';
import { RemoveMoodHandler } from './remove-mood.handler';

describe('RemoveMoodHandler', () => {
  const journalEntryRepository = {
    findByIdForOwner: jest.fn(),
  };
  const moodRepository = {
    findByJournalEntryIdForOwner: jest.fn(),
    deleteByJournalEntryIdForOwner: jest.fn(),
  };
  const handler = new RemoveMoodHandler(
    journalEntryRepository as never,
    moodRepository as never,
  );

  beforeEach(() => jest.resetAllMocks());

  it('removes an owned Mood at the expected revision', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(
      createJournalEntry(),
    );
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
    journalEntryRepository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(JournalEntryNotFoundException);
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });

  it('rejects removal when the Journal entry is not a Draft', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(
      createJournalEntry(JournalEntryState.SEALED),
    );

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(
      MoodJournalEntryNotEditableException,
    );
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });

  it('returns Mood not found when the Draft has no Mood', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(
      createJournalEntry(),
    );
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(MoodNotFoundException);
  });

  it('rejects a stale revision before deleting', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(
      createJournalEntry(),
    );
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
    journalEntryRepository.findByIdForOwner.mockResolvedValue(
      createJournalEntry(),
    );
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(createMood());
    moodRepository.deleteByJournalEntryIdForOwner.mockResolvedValue(false);

    const result = await handler.execute(
      new RemoveMoodCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(MoodRevisionConflictException);
  });
});

function createJournalEntry(
  state: JournalEntryState = JournalEntryState.DRAFT,
): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: null,
    content: '',
    state,
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
