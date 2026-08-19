import { MemoryState } from '../../../domain/enums';
import { GetMemoriesQuery } from '../get-memories.query';
import { GetMemoriesHandler } from './get-memories.handler';

describe('GetMemoriesHandler', () => {
  const repository = { findAllForOwner: jest.fn() };
  const handler = new GetMemoriesHandler(repository as never);

  beforeEach(() => {
    jest.clearAllMocks();
    repository.findAllForOwner.mockResolvedValue({ memories: [], total: 0 });
  });

  it('passes ownership, filtering, sorting and pagination to the repository', async () => {
    const result = await handler.execute(
      new GetMemoriesQuery(
        'owner-1',
        3,
        20,
        MemoryState.TRASHED,
        'summer',
        'occurredOn',
        'asc',
        'journal-entry-1',
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(repository.findAllForOwner).toHaveBeenCalledWith('owner-1', {
      skip: 40,
      take: 20,
      state: MemoryState.TRASHED,
      search: 'summer',
      sortBy: 'occurredOn',
      sortOrder: 'asc',
      sourceJournalEntryId: 'journal-entry-1',
    });
  });

  it('uses the first page and default page size', async () => {
    await handler.execute(new GetMemoriesQuery('owner-1'));

    expect(repository.findAllForOwner).toHaveBeenCalledWith('owner-1', {
      skip: 0,
      take: 10,
      state: undefined,
      search: undefined,
      sortBy: undefined,
      sortOrder: 'desc',
      sourceJournalEntryId: undefined,
    });
  });
});
