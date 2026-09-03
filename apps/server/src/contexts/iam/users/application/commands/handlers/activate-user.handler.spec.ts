import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';

import { ActivateUserCommand } from '../activate-user.command';
import { ActivateUserCommandHandler } from './activate-user.handler';

describe('ActivateUserCommandHandler', () => {
  const createUser = () =>
    UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
    });

  const createRepository = (user: UserEntity | null) =>
    ({
      findById: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<UserRepository>;

  it('activates an existing user account', async () => {
    const user = createUser();
    const repository = createRepository(user);
    const handler = new ActivateUserCommandHandler(repository);

    const result = await handler.execute(
      new ActivateUserCommand({ id: 'user-id', adminId: 'admin-id' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(user.isActive).toBe(true);
    expect(user.updatedBy).toBe('admin-id');
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('fails when the target user does not exist', async () => {
    const repository = createRepository(null);
    const handler = new ActivateUserCommandHandler(repository);

    const result = await handler.execute(
      new ActivateUserCommand({ id: 'missing-id', adminId: 'admin-id' }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserNotFoundException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
