import { JournalEntryState } from '../../../domain/enums';
import { GetJournalEntriesQuery } from '../get-journal-entries.query';
import { GetJournalEntriesHandler } from './get-journal-entries.handler';

describe('GetJournalEntriesHandler', () => {
  const journalEntryRepository = {
    findAllForOwner: jest.fn(),
  };

  const listReader = {
    extrasFor: jest.fn().mockResolvedValue(new Map()),
    writtenDaysLast7: jest.fn(),
  };

  const handler = new GetJournalEntriesHandler(
    journalEntryRepository as never,
    listReader,
  );

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
      extras: new Map(),
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

  // Tâm trạng và số ký ức đọc chung một lần cho cả trang danh sách.
  it('reads the extras of the listed entries in one go', async () => {
    const entries = [{ id: 'entry-1' }, { id: 'entry-2' }];
    const extras = new Map([['entry-1', { mood: 'CALM', memoryCount: 2 }]]);
    journalEntryRepository.findAllForOwner.mockResolvedValue({
      entries,
      total: 2,
    });
    listReader.extrasFor.mockResolvedValue(extras);

    const result = await handler.execute(new GetJournalEntriesQuery('owner-1'));

    expect(listReader.extrasFor).toHaveBeenCalledWith('owner-1', [
      'entry-1',
      'entry-2',
    ]);
    expect(result.getValue()).toEqual({ entries, total: 2, extras });
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
