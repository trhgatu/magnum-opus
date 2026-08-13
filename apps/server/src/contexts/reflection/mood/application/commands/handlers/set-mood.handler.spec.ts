import { MoodLabel } from '../../../domain/enums';
import {
  InvalidMoodIntensityException,
  MoodJournalEntryNotEditableException,
  MoodJournalEntryNotFoundException,
  MoodRevisionConflictException,
} from '../../../domain/exceptions';
import { Mood } from '../../../domain/mood.aggregate';
import { MoodId } from '../../../domain/value-objects';
import { MoodJournalEntryAccessStatus } from '../../ports/mood-journal-entry-reader.port';
import { SetMoodCommand } from '../set-mood.command';
import { SetMoodHandler } from './set-mood.handler';

describe('SetMoodHandler', () => {
  const journalEntryReader = {
    getAccessForOwner: jest.fn(),
  };

  const moodRepository = {
    create: jest.fn(),
    update: jest.fn(),
    findByJournalEntryIdForOwner: jest.fn(),
  };

  const handler = new SetMoodHandler(
    journalEntryReader as never,
    moodRepository as never,
  );

  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('creates a Mood when the Draft has none', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(null);
    moodRepository.create.mockResolvedValue(true);

    const result = await handler.execute(
      new SetMoodCommand(
        'entry-1',
        'owner-1',
        MoodLabel.CALM,
        3,
        'Quiet after the rain',
      ),
    );

    expect(result.isSuccess).toBe(true);
    const mood = result.getValue();
    expect(mood.journalEntryId).toBe('entry-1');
    expect(mood.label).toBe(MoodLabel.CALM);
    expect(mood.revision).toBe(1);
    expect(moodRepository.create).toHaveBeenCalledWith(mood);
  });

  it('updates an existing Mood at the expected revision', async () => {
    const mood = createMood();
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(mood);
    moodRepository.update.mockResolvedValue(true);

    const result = await handler.execute(
      new SetMoodCommand(
        'entry-1',
        'owner-1',
        MoodLabel.HOPEFUL,
        4,
        'A clearer direction',
        1,
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(2);
    expect(moodRepository.update).toHaveBeenCalledWith(mood, 'owner-1', 1);
  });

  it('does not persist when normalized Mood values are unchanged', async () => {
    const mood = createMood();
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(mood);

    const result = await handler.execute(
      new SetMoodCommand(
        'entry-1',
        'owner-1',
        MoodLabel.CALM,
        3,
        '  Initial note  ',
        1,
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(1);
    expect(moodRepository.update).not.toHaveBeenCalled();
  });

  it('returns not found when the owned Journal entry does not exist', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue({
      status: MoodJournalEntryAccessStatus.NOT_FOUND,
    });

    const result = await handler.execute(
      new SetMoodCommand('entry-1', 'owner-1', MoodLabel.CALM),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(MoodJournalEntryNotFoundException);
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });

  it('rejects changes when the Journal entry is not a Draft', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue({
      status: MoodJournalEntryAccessStatus.NOT_EDITABLE,
      state: 'SEALED',
    });

    const result = await handler.execute(
      new SetMoodCommand('entry-1', 'owner-1', MoodLabel.CALM),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(
      MoodJournalEntryNotEditableException,
    );
    expect(moodRepository.findByJournalEntryIdForOwner).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before mutating the Mood', async () => {
    const mood = createMood();
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(mood);

    const result = await handler.execute(
      new SetMoodCommand('entry-1', 'owner-1', MoodLabel.HOPEFUL, 4, null, 9),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(MoodRevisionConflictException);
    expect(mood.revision).toBe(1);
    expect(moodRepository.update).not.toHaveBeenCalled();
  });

  it('returns conflict when another request creates the Mood first', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(null);
    moodRepository.create.mockResolvedValue(false);

    const result = await handler.execute(
      new SetMoodCommand('entry-1', 'owner-1', MoodLabel.CALM),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(MoodRevisionConflictException);
  });

  it('returns conflict when another request updates the Mood first', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(createMood());
    moodRepository.update.mockResolvedValue(false);

    const result = await handler.execute(
      new SetMoodCommand('entry-1', 'owner-1', MoodLabel.HOPEFUL, 4, null, 1),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(MoodRevisionConflictException);
  });

  it('returns domain validation failures as Result failures', async () => {
    journalEntryReader.getAccessForOwner.mockResolvedValue(editableAccess());
    moodRepository.findByJournalEntryIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new SetMoodCommand('entry-1', 'owner-1', MoodLabel.CALM, 10),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidMoodIntensityException);
    expect(moodRepository.create).not.toHaveBeenCalled();
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
    note: 'Initial note',
    revision: 1,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
