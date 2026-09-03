import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';

import { GetUserByIdQuery } from '../get-user-by-id.query';
import { GetUserByIdQueryHandler } from './get-user-by-id.handler';

describe('GetUserByIdQueryHandler', () => {
  const createRepository = (user: UserEntity | null) =>
    ({
      findById: jest.fn().mockResolvedValue(user),
    }) as unknown as jest.Mocked<UserRepository>;

  it('returns the user when found', async () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
    });
    const repository = createRepository(user);
    const handler = new GetUserByIdQueryHandler(repository);

    const result = await handler.execute(new GetUserByIdQuery('user-id'));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(user);
    expect(repository.findById).toHaveBeenCalledWith('user-id');
  });

  it('succeeds with null when the user does not exist', async () => {
    const repository = createRepository(null);
    const handler = new GetUserByIdQueryHandler(repository);

    const result = await handler.execute(new GetUserByIdQuery('missing-id'));

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBeNull();
  });
});
