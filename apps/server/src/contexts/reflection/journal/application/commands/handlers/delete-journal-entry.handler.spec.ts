import { JournalEntryState } from '../../../domain/enums';
import {
  JournalEntryNotFoundException,
  JournalEntryPermanentDeleteForbiddenException,
  JournalEntryRevisionConflictException,
} from '../../../domain/exceptions';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../../domain/value-objects';
import { DeleteJournalEntryCommand } from '../delete-journal-entry.command';
import { DeleteJournalEntryHandler } from './delete-journal-entry.handler';

describe('DeleteJournalEntryHandler', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    deletePermanently: jest.fn(),
  };
  const handler = new DeleteJournalEntryHandler(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.deletePermanently.mockResolvedValue(true);
  });

  it('permanently deletes an owned trashed entry at the expected revision', async () => {
    repository.findByIdForOwner.mockResolvedValue(createTrashedEntry());

    const result = await handler.execute(
      new DeleteJournalEntryCommand('entry-1', 'owner-1', 2),
    );

    expect(result.isSuccess).toBe(true);
    expect(repository.deletePermanently).toHaveBeenCalledWith(
      'entry-1',
      'owner-1',
      2,
    );
  });

  it('returns not found for an inaccessible entry', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new DeleteJournalEntryCommand('entry-1', 'owner-2', 2),
    );

    expect(result.getError()).toBeInstanceOf(JournalEntryNotFoundException);
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('rejects permanent deletion outside trash', async () => {
    repository.findByIdForOwner.mockResolvedValue(
      createTrashedEntry(JournalEntryState.DRAFT),
    );

    const result = await handler.execute(
      new DeleteJournalEntryCommand('entry-1', 'owner-1', 2),
    );

    expect(result.getError()).toBeInstanceOf(
      JournalEntryPermanentDeleteForbiddenException,
    );
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('rejects a stale revision', async () => {
    repository.findByIdForOwner.mockResolvedValue(createTrashedEntry());

    const result = await handler.execute(
      new DeleteJournalEntryCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getError()).toBeInstanceOf(
      JournalEntryRevisionConflictException,
    );
    expect(repository.deletePermanently).not.toHaveBeenCalled();
  });

  it('detects a race during the atomic delete', async () => {
    repository.findByIdForOwner.mockResolvedValue(createTrashedEntry());
    repository.deletePermanently.mockResolvedValue(false);

    const result = await handler.execute(
      new DeleteJournalEntryCommand('entry-1', 'owner-1', 2),
    );

    expect(result.getError()).toBeInstanceOf(
      JournalEntryRevisionConflictException,
    );
  });
});

function createTrashedEntry(
  state: JournalEntryState = JournalEntryState.TRASHED,
): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: 'Entry',
    content: 'Content',
    state,
    stateBeforeTrash:
      state === JournalEntryState.TRASHED ? JournalEntryState.DRAFT : null,
    revision: 2,
    trashedAt:
      state === JournalEntryState.TRASHED
        ? new Date('2026-08-02T00:00:00.000Z')
        : null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-02T00:00:00.000Z'),
  });
}
