import { PERMISSIONS } from '@repo/contracts';
import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';
import { RoleAlreadyExistsException } from '@iam/roles/domain/exceptions/role-already-exists.exception';

import { CreateRoleCommand } from '../create-role.command';
import { CreateRoleCommandHandler } from './create-role.handler';

describe('CreateRoleCommandHandler', () => {
  const createRepository = (overrides?: Partial<jest.Mocked<RoleRepository>>) =>
    ({
      findByName: jest.fn().mockResolvedValue(null),
      nextIdentity: jest.fn().mockReturnValue('new-role-id'),
      save: jest.fn().mockResolvedValue(undefined),
      ...overrides,
    }) as unknown as jest.Mocked<RoleRepository>;

  it('registers a new role with the baseline read permission', async () => {
    const repository = createRepository();
    const handler = new CreateRoleCommandHandler(repository);

    const result = await handler.execute(
      new CreateRoleCommand({
        name: 'SUPPORT',
        description: 'Handles support tickets',
        createdBy: 'admin-id',
      }),
    );

    expect(result.isSuccess).toBe(true);
    const role = result.getValue();
    expect(role.id).toBe('new-role-id');
    expect(role.name).toBe('SUPPORT');
    expect(role.description).toBe('Handles support tickets');
    expect(role.permissions).toEqual([PERMISSIONS.USER.READ]);
    expect(repository.save).toHaveBeenCalledWith(role);
  });

  it('fails when a role with the same name already exists', async () => {
    const repository = createRepository({
      findByName: jest.fn().mockResolvedValue({ id: 'existing-id' } as never),
    });
    const handler = new CreateRoleCommandHandler(repository);

    const result = await handler.execute(
      new CreateRoleCommand({ name: 'SUPPORT' }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(RoleAlreadyExistsException);
    expect(repository.save).not.toHaveBeenCalled();
  });
});
