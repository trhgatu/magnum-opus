import { JournalEntryState } from '../../../domain/enums';
import { CreateJournalEntryCommand } from '../create-journal-entry.command';
import { CreateJournalEntryHandler } from './create-journal-entry.handler';

describe('CreateJournalEntryHandler', () => {
  const journalEntryRepository = {
    create: jest.fn(),
  };

  const handler = new CreateJournalEntryHandler(
    journalEntryRepository as never,
  );

  beforeEach(() => {
    jest.clearAllMocks();
    journalEntryRepository.create.mockResolvedValue(undefined);
  });

  it('creates and persists a private draft for the owner', async () => {
    const result = await handler.execute(
      new CreateJournalEntryCommand({
        ownerId: 'owner-1',
        title: '  First thought  ',
        content: 'Private content',
      }),
    );

    expect(result.isSuccess).toBe(true);

    const entry = result.getValue();

    expect(entry.ownerId).toBe('owner-1');
    expect(entry.title).toBe('First thought');
    expect(entry.content).toBe('Private content');
    expect(entry.state).toBe(JournalEntryState.DRAFT);
    expect(entry.revision).toBe(1);

    expect(journalEntryRepository.create).toHaveBeenCalledWith(entry);
  });

  it('creates an empty draft when optional fields are omitted', async () => {
    const result = await handler.execute(
      new CreateJournalEntryCommand({
        ownerId: 'owner-1',
      }),
    );

    const entry = result.getValue();

    expect(entry.title).toBeNull();
    expect(entry.content).toBe('');
    expect(entry.state).toBe(JournalEntryState.DRAFT);
  });
});
