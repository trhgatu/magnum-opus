import { JournalEntryState } from '../../../domain/enums';
import { JournalEntry } from '../../../domain/journal-entry.aggregate';
import { JournalEntryId } from '../../../domain/value-objects';
import { GetJournalEntryQuery } from '../get-journal-entry.query';
import { GetJournalEntryHandler } from './get-journal-entry.handler';

describe('GetJournalEntryHandler', () => {
  const journalEntryRepository = {
    findByIdForOwner: jest.fn(),
  };

  const handler = new GetJournalEntryHandler(journalEntryRepository as never);

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns an entry owned by the requesting user', async () => {
    const entry = createEntry();

    journalEntryRepository.findByIdForOwner.mockResolvedValue(entry);

    const result = await handler.execute(
      new GetJournalEntryQuery('entry-1', 'owner-1'),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(entry);

    expect(journalEntryRepository.findByIdForOwner).toHaveBeenCalledWith(
      'entry-1',
      'owner-1',
    );
  });

  it('returns not found when the owner-scoped lookup fails', async () => {
    journalEntryRepository.findByIdForOwner.mockResolvedValue(null);

    const result = await handler.execute(
      new GetJournalEntryQuery('entry-1', 'different-owner'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError().message).toContain('entry-1');
  });
});

function createEntry(): JournalEntry {
  return JournalEntry.rehydrate({
    id: new JournalEntryId('entry-1'),
    ownerId: 'owner-1',
    title: 'Private entry',
    content: 'Private content',
    state: JournalEntryState.DRAFT,
    stateBeforeTrash: null,
    revision: 1,
    trashedAt: null,
    createdAt: new Date('2026-08-01T00:00:00.000Z'),
    updatedAt: new Date('2026-08-01T00:00:00.000Z'),
  });
}
