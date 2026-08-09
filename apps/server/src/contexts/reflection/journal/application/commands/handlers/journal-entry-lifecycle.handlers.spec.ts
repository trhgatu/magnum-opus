import { JournalEntryState } from '../../../domain/enums';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../../domain/value-objects';
import { JournalEntryMutationService } from '../../services';
import { ReopenJournalEntryCommand } from '../reopen-journal-entry.command';
import { RestoreJournalEntryCommand } from '../restore-journal-entry.command';
import { SealJournalEntryCommand } from '../seal-journal-entry.command';
import { TrashJournalEntryCommand } from '../trash-journal-entry.command';
import { ReopenJournalEntryHandler } from './reopen-journal-entry.handler';
import { RestoreJournalEntryHandler } from './restore-journal-entry.handler';
import { SealJournalEntryHandler } from './seal-journal-entry.handler';
import { TrashJournalEntryHandler } from './trash-journal-entry.handler';

describe('Journal lifecycle command handlers', () => {
  const repository = {
    findByIdForOwner: jest.fn(),
    update: jest.fn(),
  };
  const mutationService = new JournalEntryMutationService(repository as never);
  const sealHandler = new SealJournalEntryHandler(mutationService);
  const reopenHandler = new ReopenJournalEntryHandler(mutationService);
  const trashHandler = new TrashJournalEntryHandler(mutationService);
  const restoreHandler = new RestoreJournalEntryHandler(mutationService);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.update.mockResolvedValue(true);
  });

  it('seals a draft', async () => {
    const entry = createEntry();
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await sealHandler.execute(
      new SealJournalEntryCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getValue().state).toBe(JournalEntryState.SEALED);
    expect(result.getValue().revision).toBe(2);
  });

  it('reopens a sealed entry', async () => {
    const entry = createEntry({ state: JournalEntryState.SEALED });
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await reopenHandler.execute(
      new ReopenJournalEntryCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getValue().state).toBe(JournalEntryState.DRAFT);
    expect(result.getValue().revision).toBe(2);
  });

  it('moves a sealed entry to trash and remembers its state', async () => {
    const entry = createEntry({ state: JournalEntryState.SEALED });
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await trashHandler.execute(
      new TrashJournalEntryCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getValue().state).toBe(JournalEntryState.TRASHED);
    expect(result.getValue().stateBeforeTrash).toBe(JournalEntryState.SEALED);
    expect(result.getValue().trashedAt).toBeInstanceOf(Date);
  });

  it('restores a trashed entry to its previous state', async () => {
    const entry = createEntry({
      state: JournalEntryState.TRASHED,
      stateBeforeTrash: JournalEntryState.SEALED,
      trashedAt: new Date('2026-08-02T00:00:00.000Z'),
    });
    repository.findByIdForOwner.mockResolvedValue(entry);

    const result = await restoreHandler.execute(
      new RestoreJournalEntryCommand('entry-1', 'owner-1', 1),
    );

    expect(result.getValue().state).toBe(JournalEntryState.SEALED);
    expect(result.getValue().stateBeforeTrash).toBeNull();
    expect(result.getValue().trashedAt).toBeNull();
  });
});

function createEntry(
  overrides: Partial<{
    state: JournalEntryState;
    stateBeforeTrash: JournalEntryState | null;
    trashedAt: Date | null;
  }> = {},
): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: 'Entry',
    content: 'Content',
    state: overrides.state ?? JournalEntryState.DRAFT,
    stateBeforeTrash: overrides.stateBeforeTrash ?? null,
    revision: 1,
    trashedAt: overrides.trashedAt ?? null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
