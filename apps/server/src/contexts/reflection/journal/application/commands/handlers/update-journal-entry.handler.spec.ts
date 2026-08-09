import {
  JournalEntryNotFoundException,
  JournalEntryRevisionConflictException,
} from '../../../domain/exceptions';
import { JournalEntryState } from '../../../domain/enums';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../../domain/value-objects';
import { JournalEntryMutationService } from '../../services';
import { UpdateJournalEntryCommand } from '../update-journal-entry.command';
import { UpdateJournalEntryHandler } from './update-journal-entry.handler';

describe('UpdateJournalEntryHandler', () => {
  const journalEntryRepository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };

  const mutationService = new JournalEntryMutationService(
    journalEntryRepository as never,
  );
  const handler = new UpdateJournalEntryHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    journalEntryRepository.update.mockResolvedValue(true);
  });

  it('updates content using the expected revision', async () => {
    const entry = createEntry();

    journalEntryRepository.findByIdForOwner.mockResolvedValue(entry);

    const result = await handler.execute(
      new UpdateJournalEntryCommand(
        'entry-1',
        'owner-1',
        1,
        'Updated title',
        'Updated content',
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().title).toBe('Updated title');
    expect(result.getValue().content).toBe('Updated content');
    expect(result.getValue().revision).toBe(2);

    expect(journalEntryRepository.update).toHaveBeenCalledWith(entry, 1);
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new UpdateJournalEntryCommand(
        'entry-1',
        'different-owner',
        1,
        'Updated title',
        'Updated content',
      ),
    );

    expect(result.getError()).toBeInstanceOf(JournalEntryNotFoundException);
    expect(journalEntryRepository.update).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before mutating the aggregate', async () => {
    const entry = createEntry(3);

    journalEntryRepository.findByIdForOwner.mockResolvedValue(entry);

    const result = await handler.execute(
      new UpdateJournalEntryCommand(
        'entry-1',
        'owner-1',
        2,
        'Stale title',
        'Stale content',
      ),
    );

    expect(result.getError()).toBeInstanceOf(
      JournalEntryRevisionConflictException,
    );
    expect(entry.title).toBe('Original title');
    expect(entry.content).toBe('Original content');
    expect(entry.revision).toBe(3);
    expect(journalEntryRepository.update).not.toHaveBeenCalled();
  });

  it('detects a race that happens after the entry was loaded', async () => {
    const entry = createEntry();

    journalEntryRepository.findByIdForOwner.mockResolvedValue(entry);
    journalEntryRepository.update.mockResolvedValue(false);

    const result = await handler.execute(
      new UpdateJournalEntryCommand(
        'entry-1',
        'owner-1',
        1,
        'Concurrent title',
        'Concurrent content',
      ),
    );

    expect(result.getError()).toBeInstanceOf(
      JournalEntryRevisionConflictException,
    );
    expect(journalEntryRepository.update).toHaveBeenCalledWith(entry, 1);
  });

  it('does not write when title and content are unchanged', async () => {
    const entry = createEntry();

    journalEntryRepository.findByIdForOwner.mockResolvedValue(entry);

    const result = await handler.execute(
      new UpdateJournalEntryCommand(
        'entry-1',
        'owner-1',
        1,
        'Original title',
        'Original content',
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(1);
    expect(journalEntryRepository.update).not.toHaveBeenCalled();
  });
});

function createEntry(revision = 1): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: 'Original title',
    content: 'Original content',
    state: JournalEntryState.DRAFT,
    stateBeforeTrash: null,
    revision,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
