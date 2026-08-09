import {
  InvalidJournalEntryTransitionException,
  JournalEntryNotFoundException,
  JournalEntryRevisionConflictException,
} from '../../domain/exceptions';
import { JournalEntryState } from '../../domain/enums';
import { JournalEntry } from '../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../domain/value-objects';
import { JournalEntryMutationService } from './journal-entry-mutation.service';

describe('JournalEntryMutationService', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };
  const service = new JournalEntryMutationService(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('returns not found for an inaccessible entry', async () => {
    repository.findByIdForOwner.mockResolvedValue(null);

    const result = await service.mutate({
      entryId: 'entry-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (entry) => entry.seal(),
    });

    expect(result.getError()).toBeInstanceOf(JournalEntryNotFoundException);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('rejects a stale revision before mutation', async () => {
    const entry = createEntry({ revision: 3 });
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await service.mutate({
      entryId: 'entry-1',
      ownerId: 'owner-1',
      expectedRevision: 2,
      mutate: (current) => current.seal(),
    });

    expect(result.getError()).toBeInstanceOf(
      JournalEntryRevisionConflictException,
    );
    expect(entry.state).toBe(JournalEntryState.DRAFT);
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('persists a successful domain mutation', async () => {
    const entry = createEntry();
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await service.mutate({
      entryId: 'entry-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (current) => current.seal(),
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().state).toBe(JournalEntryState.SEALED);
    expect(result.getValue().revision).toBe(2);
    expect(repository.update).toHaveBeenCalledWith(entry, 1);
  });

  it('detects a race during the atomic update', async () => {
    const entry = createEntry();
    repository.findByIdForOwner.mockResolvedValue(entry);
    repository.update.mockResolvedValue(false);

    const result = await service.mutate({
      entryId: 'entry-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (current) => current.seal(),
    });

    expect(result.getError()).toBeInstanceOf(
      JournalEntryRevisionConflictException,
    );
  });

  it('returns an invalid transition as a failed result', async () => {
    const entry = createEntry({ state: JournalEntryState.SEALED });
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await service.mutate({
      entryId: 'entry-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: (current) => current.seal(),
    });

    expect(result.getError()).toBeInstanceOf(
      InvalidJournalEntryTransitionException,
    );
    expect(repository.update).not.toHaveBeenCalled();
  });

  it('skips persistence when the mutation is a no-op', async () => {
    const entry = createEntry();
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await service.mutate({
      entryId: 'entry-1',
      ownerId: 'owner-1',
      expectedRevision: 1,
      mutate: () => undefined,
    });

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().revision).toBe(1);
    expect(repository.update).not.toHaveBeenCalled();
  });
});

function createEntry(
  overrides: Partial<{
    state: JournalEntryState;
    revision: number;
  }> = {},
): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: 'Original title',
    content: 'Original content',
    state: overrides.state ?? JournalEntryState.DRAFT,
    stateBeforeTrash: null,
    revision: overrides.revision ?? 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
