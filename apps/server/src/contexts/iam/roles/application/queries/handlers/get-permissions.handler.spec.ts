import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';

import { GetPermissionsQueryHandler } from './get-permissions.handler';

describe('GetPermissionsQueryHandler', () => {
  it('returns every system permission from the repository', async () => {
    const permissions = [
      {
        id: 'perm-id',
        name: 'user:read',
        description: null,
        displayName: null,
        module: 'user',
      },
    ];
    const repository = {
      findAllPermissions: jest.fn().mockResolvedValue(permissions),
    } as unknown as jest.Mocked<RoleRepository>;
    const handler = new GetPermissionsQueryHandler(repository);

    const result = await handler.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(permissions);
  });
});
