import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';

import { DeleteUserCommand } from '../delete-user.command';
import { DeleteUserCommandHandler } from './delete-user.handler';

describe('DeleteUserCommandHandler', () => {
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

  it('soft deletes an existing user account', async () => {
    const user = createUser();
    const repository = createRepository(user);
    const handler = new DeleteUserCommandHandler(repository);

    const result = await handler.execute(
      new DeleteUserCommand({ id: 'user-id', adminId: 'admin-id' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(user.isDeleted).toBe(true);
    expect(user.updatedBy).toBe('admin-id');
    expect(repository.savePreservingLastAdministrator).toHaveBeenCalledWith(
      user,
    );
  });

  it('fails when the target user does not exist', async () => {
    const repository = createRepository(null);
    const handler = new DeleteUserCommandHandler(repository);

    const result = await handler.execute(
      new DeleteUserCommand({ id: 'missing-id', adminId: 'admin-id' }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserNotFoundException);
    expect(repository.savePreservingLastAdministrator).not.toHaveBeenCalled();
  });
});
