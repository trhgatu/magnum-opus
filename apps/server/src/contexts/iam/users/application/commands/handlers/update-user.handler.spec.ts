import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';
import { UserNotFoundException } from '@iam/users/domain/exceptions/user-not-found.exception';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import { InvalidUserRolesException } from '@iam/users/domain/exceptions/invalid-user-roles.exception';

import { UpdateUserCommand } from '../update-user.command';
import { UpdateUserCommandHandler } from './update-user.handler';

describe('UpdateUserCommandHandler', () => {
  const createUser = (overrides?: { id?: string; email?: string }) =>
    UserEntity.register({
      id: overrides?.id ?? 'user-id',
      email: overrides?.email ?? 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      roles: ['USER'],
    });

  const createRepository = (
    user: UserEntity | null,
    overrides?: Partial<jest.Mocked<UserRepository>>,
  ) =>
    ({
      findById: jest.fn().mockResolvedValue(user),
      findByEmail: jest.fn().mockResolvedValue(null),
      findExistingRoleNames: jest.fn().mockResolvedValue(['USER', 'EDITOR']),
      savePreservingLastAdministrator: jest.fn().mockResolvedValue(true),
      ...overrides,
    }) as unknown as jest.Mocked<UserRepository>;

  it('updates info and roles for an existing user', async () => {
    const user = createUser();
    const repository = createRepository(user);
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'user-id',
        email: 'member@example.com',
        username: 'member-renamed',
        roles: ['USER', 'EDITOR'],
        updatedBy: 'admin-id',
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(user.username).toBe('member-renamed');
    expect(user.roles).toEqual(['USER', 'EDITOR']);
    expect(repository.savePreservingLastAdministrator).toHaveBeenCalledWith(
      user,
    );
  });

  it('fails when the target user does not exist', async () => {
    const repository = createRepository(null);
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'missing-id',
        email: 'member@example.com',
        username: 'member',
        roles: ['USER'],
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserNotFoundException);
  });

  it('fails when the new email already belongs to another user', async () => {
    const user = createUser();
    const otherUser = createUser({
      id: 'other-id',
      email: 'taken@example.com',
    });
    const repository = createRepository(user, {
      findByEmail: jest.fn().mockResolvedValue(otherUser),
    });
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'user-id',
        email: 'taken@example.com',
        username: 'member',
        roles: ['USER'],
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserAlreadyExistsException);
  });

  it('allows keeping the same email for the same user', async () => {
    const user = createUser();
    const repository = createRepository(user, {
      findByEmail: jest.fn().mockResolvedValue(user),
    });
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'user-id',
        email: 'member@example.com',
        username: 'member',
        roles: ['USER'],
      }),
    );

    expect(result.isSuccess).toBe(true);
  });

  it('fails when a requested role does not exist', async () => {
    const user = createUser();
    const repository = createRepository(user, {
      findExistingRoleNames: jest.fn().mockResolvedValue(['USER']),
    });
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'user-id',
        email: 'member@example.com',
        username: 'member',
        roles: ['USER', 'GHOST'],
      }),
    );

    expect(result.isFailure).toBe(true);
    const error = result.getError();
    expect(error).toBeInstanceOf(InvalidUserRolesException);
    expect(error.args).toEqual({ unknownRoles: ['GHOST'] });
  });

  it('fails when no roles remain after deduplication', async () => {
    const user = createUser();
    const repository = createRepository(user, {
      findExistingRoleNames: jest.fn().mockResolvedValue([]),
    });
    const handler = new UpdateUserCommandHandler(repository);

    const result = await handler.execute(
      new UpdateUserCommand({
        id: 'user-id',
        email: 'member@example.com',
        username: 'member',
        roles: [],
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidUserRolesException);
  });
});
