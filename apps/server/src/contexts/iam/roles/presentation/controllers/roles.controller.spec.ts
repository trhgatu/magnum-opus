import { Result } from '@shared/domain/result';

import {
  CreateRoleCommand,
  DeleteRoleCommand,
  UpdateRolePermissionsCommand,
} from '../../application/commands';
import { GetPermissionsQuery, GetRolesQuery } from '../../application/queries';
import { RoleEntity } from '../../domain/role.entity';
import { RolesController } from './roles.controller';

describe('RolesController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new RolesController(
    queryBus as never,
    commandBus as never,
  );

  beforeEach(() => jest.clearAllMocks());

  it('returns every role with its mapped permissions', async () => {
    const role = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
      permissions: ['user:read'],
    });
    queryBus.execute.mockResolvedValue(Result.ok([role]));

    const response = await controller.getRoles();

    expect(queryBus.execute).toHaveBeenCalledWith(new GetRolesQuery());
    expect(response).toEqual([
      {
        id: 'role-id',
        name: 'SUPPORT',
        description: null,
        permissions: ['user:read'],
        createdAt: role.createdAt,
      },
    ]);
  });

  it('returns every system permission', async () => {
    const permissions = [
      {
        id: 'perm-id',
        name: 'user:read',
        description: null,
        displayName: null,
        module: 'user',
      },
    ];
    queryBus.execute.mockResolvedValue(Result.ok(permissions));

    const response = await controller.getPermissions();

    expect(queryBus.execute).toHaveBeenCalledWith(new GetPermissionsQuery());
    expect(response).toBe(permissions);
  });

  it('creates a role attributed to the requesting user', async () => {
    const role = RoleEntity.register({ id: 'role-id', name: 'SUPPORT' });
    commandBus.execute.mockResolvedValue(Result.ok(role));

    const response = await controller.createRole(
      { name: 'SUPPORT', description: undefined } as never,
      { id: 'admin-id' } as never,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      new CreateRoleCommand({
        name: 'SUPPORT',
        description: undefined,
        createdBy: 'admin-id',
      }),
    );
    expect(response).toEqual({
      id: 'role-id',
      name: 'SUPPORT',
      description: null,
      permissions: [],
    });
  });

  it('updates permissions for a role', async () => {
    const role = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
      permissions: ['user:read', 'user:update'],
    });
    commandBus.execute.mockResolvedValue(Result.ok(role));

    const response = await controller.updatePermissions(
      'role-id',
      { permissions: ['user:read', 'user:update'] } as never,
      { id: 'admin-id' } as never,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      new UpdateRolePermissionsCommand({
        id: 'role-id',
        permissions: ['user:read', 'user:update'],
        updatedBy: 'admin-id',
      }),
    );
    expect(response.permissions).toEqual(['user:read', 'user:update']);
  });

  it('deletes a role', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.deleteRole('role-id');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new DeleteRoleCommand({ id: 'role-id' }),
    );
    expect(response).toBeUndefined();
  });
});
