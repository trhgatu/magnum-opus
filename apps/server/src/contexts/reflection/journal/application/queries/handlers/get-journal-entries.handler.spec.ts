import { JournalEntryState } from '../../../domain/enums';
import { GetJournalEntriesQuery } from '../get-journal-entries.query';
import { GetJournalEntriesHandler } from './get-journal-entries.handler';

describe('GetJournalEntriesHandler', () => {
  const journalEntryRepository = {
    findAllForOwner: jest.fn(),
  };

  const handler = new GetJournalEntriesHandler(journalEntryRepository as never);

  beforeEach(() => {
    jest.clearAllMocks();

    journalEntryRepository.findAllForOwner.mockResolvedValue({
      entries: [],
      total: 0,
    });
  });

  it('lists only entries owned by the requesting user', async () => {
    const result = await handler.execute(
      new GetJournalEntriesQuery(
        'owner-1',
        2,
        5,
        JournalEntryState.DRAFT,
        'thought',
        'createdAt',
        'asc',
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      entries: [],
      total: 0,
    });

    expect(journalEntryRepository.findAllForOwner).toHaveBeenCalledWith(
      'owner-1',
      {
        skip: 5,
        take: 5,
        state: JournalEntryState.DRAFT,
        search: 'thought',
        sortBy: 'createdAt',
        sortOrder: 'asc',
      },
    );
  });

  it('uses the first page and default page size', async () => {
    await handler.execute(new GetJournalEntriesQuery('owner-1'));

    expect(journalEntryRepository.findAllForOwner).toHaveBeenCalledWith(
      'owner-1',
      {
        skip: 0,
        take: 10,
        state: undefined,
        search: undefined,
        sortBy: undefined,
        sortOrder: 'desc',
      },
    );
  });
});
