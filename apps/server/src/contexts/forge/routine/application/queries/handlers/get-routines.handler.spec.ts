import { GetRoutinesQuery } from '../get-routines.query';
import { GetRoutinesHandler } from './get-routines.handler';

describe('GetRoutinesHandler', () => {
  const reader = {
    findAllForOwner: jest.fn(),
  };

  const handler = new GetRoutinesHandler(reader as never);

  beforeEach(() => {
    jest.clearAllMocks();

    reader.findAllForOwner.mockResolvedValue({
      routines: [],
      total: 0,
    });
  });

  it('translates pagination and forwards owner-scoped filters', async () => {
    const result = await handler.execute(
      new GetRoutinesQuery('owner-id', 3, 20, false, 'ritual', 'title', 'asc'),
    );

    expect(result.getValue()).toEqual({
      routines: [],
      total: 0,
    });

    expect(reader.findAllForOwner).toHaveBeenCalledWith('owner-id', {
      skip: 40,
      take: 20,
      isActive: false,
      search: 'ritual',
      sortBy: 'title',
      sortOrder: 'asc',
    });
  });
});
