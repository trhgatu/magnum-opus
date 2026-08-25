import { GetHabitsQuery } from '../get-habits.query';
import { GetHabitsHandler } from './get-habits.handler';

describe('GetHabitsHandler', () => {
  const reader = {
    findAllForOwner: jest.fn(),
  };

  const handler = new GetHabitsHandler(reader as never);

  beforeEach(() => {
    jest.clearAllMocks();
    reader.findAllForOwner.mockResolvedValue({ habits: [], total: 0 });
  });

  it('translates pagination and forwards owner-scoped filters', async () => {
    const result = await handler.execute(
      new GetHabitsQuery('owner-id', 3, 20, false, 'walk', 'title', 'asc'),
    );

    expect(result.getValue()).toEqual({ habits: [], total: 0 });
    expect(reader.findAllForOwner).toHaveBeenCalledWith('owner-id', {
      skip: 40,
      take: 20,
      isActive: false,
      search: 'walk',
      sortBy: 'title',
      sortOrder: 'asc',
    });
  });
});
