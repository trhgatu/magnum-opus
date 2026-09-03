import { Result } from '@shared/domain/result';

import {
  ActivateUserCommand,
  CreateUserCommand,
  DeactivateUserCommand,
  DeleteUserCommand,
  UpdateUserCommand,
} from '../../application/commands';
import { GetUserByIdQuery, GetUsersQuery } from '../../application/queries';
import { UserEntity } from '../../domain/user.entity';
import { UserController } from './user.controller';

describe('UserController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new UserController(queryBus as never, commandBus as never);

  beforeEach(() => jest.clearAllMocks());

  const createUser = () =>
    UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      roles: ['USER'],
    });

  it('returns the current user profile merged with their permissions', async () => {
    queryBus.execute.mockResolvedValue(Result.ok(createUser()));

    const response = await controller.getMe({
      id: 'user-id',
      permissions: ['user:read'],
    } as never);

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetUserByIdQuery('user-id'),
    );
    expect(response).toMatchObject({
      id: 'user-id',
      email: 'member@example.com',
      permissions: ['user:read'],
    });
    expect(response).not.toHaveProperty('password');
  });

  it('returns null when the current user cannot be found', async () => {
    queryBus.execute.mockResolvedValue(Result.ok(null));

    const response = await controller.getMe({
      id: 'missing-id',
      permissions: [],
    } as never);

    expect(response).toBeNull();
  });

  it('maps the list query and returns pagination metadata', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({ users: [createUser()], total: 1 }),
    );

    const response = await controller.getUsers({
      page: 2,
      limit: 10,
      search: 'member',
      sortBy: 'email',
      sortOrder: 'asc',
    } as never);

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetUsersQuery(2, 10, 'member', 'email', 'asc'),
    );
    expect(response.meta).toEqual({
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 2,
    });
  });

  it('creates a user under the requesting admin', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createUser()));

    const response = await controller.createUser(
      {
        email: 'member@example.com',
        username: 'member',
        password: 'a-strong-password',
        roles: ['USER'],
      } as never,
      'admin-id',
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      new CreateUserCommand({
        email: 'member@example.com',
        username: 'member',
        passwordHash: 'a-strong-password',
        roles: ['USER'],
        avatar: undefined,
        createdBy: 'admin-id',
      }),
    );
    expect(response.id).toBe('user-id');
    expect(response).not.toHaveProperty('password');
  });

  it('defaults new users to the USER role when none is given', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(createUser()));

    await controller.createUser(
      {
        email: 'member@example.com',
        username: 'member',
        password: 'a-strong-password',
      } as never,
      'admin-id',
    );

    const command = commandBus.execute.mock.calls[0]?.[0];
    expect(command.roles).toEqual(['USER']);
  });

  it('activates a user under the requesting admin', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.activateUser('user-id', 'admin-id');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new ActivateUserCommand({ id: 'user-id', adminId: 'admin-id' }),
    );
    expect(response).toEqual({ success: true });
  });

  it('deactivates a user under the requesting admin', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.deactivateUser('user-id', 'admin-id');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new DeactivateUserCommand({ id: 'user-id', adminId: 'admin-id' }),
    );
    expect(response).toEqual({ success: true });
  });

  it('updates a user under the requesting admin', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.updateUser(
      'user-id',
      {
        email: 'renamed@example.com',
        username: 'renamed',
        roles: ['USER', 'EDITOR'],
      } as never,
      'admin-id',
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateUserCommand({
        id: 'user-id',
        email: 'renamed@example.com',
        username: 'renamed',
        roles: ['USER', 'EDITOR'],
        avatar: undefined,
        updatedBy: 'admin-id',
      }),
    );
    expect(response).toEqual({ success: true });
  });

  it('deletes a user under the requesting admin', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.deleteUser('user-id', 'admin-id');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new DeleteUserCommand({ id: 'user-id', adminId: 'admin-id' }),
    );
    expect(response).toBeUndefined();
  });
});
