import type { RoleRepository } from '@iam/roles/domain/ports/role.repository';
import { RoleEntity } from '@iam/roles/domain/role.entity';

import { GetRolesQueryHandler } from './get-roles.handler';

describe('GetRolesQueryHandler', () => {
  it('returns every role from the repository', async () => {
    const roles = [RoleEntity.register({ id: 'role-id', name: 'SUPPORT' })];
    const repository = {
      findAll: jest.fn().mockResolvedValue(roles),
    } as unknown as jest.Mocked<RoleRepository>;
    const handler = new GetRolesQueryHandler(repository);

    const result = await handler.execute();

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toBe(roles);
  });
});
