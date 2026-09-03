import type { UserRepository } from '@iam/users/domain/ports/user.repository';

import { GetUsersQuery } from '../get-users.query';
import { GetUsersQueryHandler } from './get-users.handler';

describe('GetUsersQueryHandler', () => {
  const createRepository = () =>
    ({
      findAll: jest.fn().mockResolvedValue({ users: [], total: 0 }),
    }) as unknown as jest.Mocked<UserRepository>;

  it('translates page and limit into a skip/take offset', async () => {
    const repository = createRepository();
    const handler = new GetUsersQueryHandler(repository);

    await handler.execute(new GetUsersQuery(3, 20, 'member', 'email', 'asc'));

    expect(repository.findAll).toHaveBeenCalledWith({
      skip: 40,
      take: 20,
      search: 'member',
      sortBy: 'email',
      sortOrder: 'asc',
    });
  });

  it('returns the paginated result from the repository', async () => {
    const users = [{ id: 'user-id' }];
    const repository = createRepository();
    repository.findAll.mockResolvedValue({ users: users as never, total: 1 });
    const handler = new GetUsersQueryHandler(repository);

    const result = await handler.execute(new GetUsersQuery());

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({ users, total: 1 });
  });
});
