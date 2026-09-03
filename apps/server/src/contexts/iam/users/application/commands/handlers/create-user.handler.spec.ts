import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/application/ports/password-hasher.port';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';
import { InvalidUserRolesException } from '@iam/users/domain/exceptions/invalid-user-roles.exception';

import { CreateUserCommand } from '../create-user.command';
import { CreateUserCommandHandler } from './create-user.handler';

describe('CreateUserCommandHandler', () => {
  const createRepository = (overrides?: Partial<jest.Mocked<UserRepository>>) =>
    ({
      findByEmail: jest.fn().mockResolvedValue(null),
      findExistingRoleNames: jest.fn().mockResolvedValue(['USER', 'EDITOR']),
      nextIdentity: jest.fn().mockReturnValue('new-user-id'),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as jest.Mocked<UserRepository>;

  const createHasher = () =>
    ({
      hash: jest.fn().mockResolvedValue('hashed-password'),
    }) as unknown as jest.Mocked<PasswordHasher>;

  it('registers a new user with deduplicated roles and a hashed password', async () => {
    const repository = createRepository();
    const hasher = createHasher();
    const handler = new CreateUserCommandHandler(repository, hasher);

    const result = await handler.execute(
      new CreateUserCommand({
        email: 'member@example.com',
        username: 'member',
        passwordHash: 'plain-password',
        roles: ['USER', 'USER', 'EDITOR'],
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(hasher.hash).toHaveBeenCalledWith('plain-password');
    const user = result.getValue();
    expect(user.id).toBe('new-user-id');
    expect(user.password).toBe('hashed-password');
    expect(user.roles).toEqual(['USER', 'EDITOR']);
    expect(repository.save).toHaveBeenCalledWith(user);
  });

  it('fails when the email is already registered', async () => {
    const existing = { id: 'existing-id' };
    const repository = createRepository({
      findByEmail: jest.fn().mockResolvedValue(existing as never),
    });
    const hasher = createHasher();
    const handler = new CreateUserCommandHandler(repository, hasher);

    const result = await handler.execute(
      new CreateUserCommand({
        email: 'member@example.com',
        username: 'member',
        passwordHash: 'plain-password',
        roles: ['USER'],
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserAlreadyExistsException);
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('fails when a requested role does not exist', async () => {
    const repository = createRepository({
      findExistingRoleNames: jest.fn().mockResolvedValue(['USER']),
    });
    const hasher = createHasher();
    const handler = new CreateUserCommandHandler(repository, hasher);

    const result = await handler.execute(
      new CreateUserCommand({
        email: 'member@example.com',
        username: 'member',
        passwordHash: 'plain-password',
        roles: ['USER', 'GHOST'],
      }),
    );

    expect(result.isFailure).toBe(true);
    const error = result.getError();
    expect(error).toBeInstanceOf(InvalidUserRolesException);
    expect(error.args).toEqual({ unknownRoles: ['GHOST'] });
    expect(repository.save).not.toHaveBeenCalled();
  });

  it('fails when no roles are provided', async () => {
    const repository = createRepository({
      findExistingRoleNames: jest.fn().mockResolvedValue([]),
    });
    const hasher = createHasher();
    const handler = new CreateUserCommandHandler(repository, hasher);

    const result = await handler.execute(
      new CreateUserCommand({
        email: 'member@example.com',
        username: 'member',
        passwordHash: 'plain-password',
        roles: [],
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidUserRolesException);
  });
});
