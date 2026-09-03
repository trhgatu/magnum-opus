import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';

import { DeactivateUserCommand } from '../deactivate-user.command';
import { DeactivateUserCommandHandler } from './deactivate-user.handler';

describe('DeactivateUserCommandHandler', () => {
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
      savePreservingLastAdministrator: jest.fn().mockResolvedValue(true),
    }) as unknown as jest.Mocked<UserRepository>;

  it('deactivates an existing user account', async () => {
    const user = createUser();
    const repository = createRepository(user);
    const handler = new DeactivateUserCommandHandler(repository);

    const result = await handler.execute(
      new DeactivateUserCommand({ id: 'user-id', adminId: 'admin-id' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(user.isActive).toBe(false);
    expect(user.updatedBy).toBe('admin-id');
    expect(repository.savePreservingLastAdministrator).toHaveBeenCalledWith(
      user,
    );
  });

  it('fails when the target user does not exist', async () => {
    const repository = createRepository(null);
    const handler = new DeactivateUserCommandHandler(repository);

    const result = await handler.execute(
      new DeactivateUserCommand({ id: 'missing-id', adminId: 'admin-id' }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserNotFoundException);
    expect(repository.savePreservingLastAdministrator).not.toHaveBeenCalled();
  });
});
