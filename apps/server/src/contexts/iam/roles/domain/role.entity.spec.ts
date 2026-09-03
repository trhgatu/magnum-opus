import { RoleEntity } from './role.entity';

describe('RoleEntity', () => {
  it('registers a role with the given permissions, defaulting to none', () => {
    const withDefaults = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
    });
    expect(withDefaults.permissions).toEqual([]);
    expect(withDefaults.description).toBeNull();
    expect(withDefaults.isDeleted).toBe(false);

    const withPermissions = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
      description: 'Handles tickets',
      permissions: ['user:read'],
      createdBy: 'admin-id',
    });
    expect(withPermissions.permissions).toEqual(['user:read']);
    expect(withPermissions.description).toBe('Handles tickets');
    expect(withPermissions.createdBy).toBe('admin-id');
  });

  it('deduplicates permissions and tracks who updated them', () => {
    const role = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
      permissions: ['user:read'],
    });

    role.updatePermissions(
      ['user:read', 'user:update', 'user:read'],
      'admin-id',
    );

    expect(role.permissions).toEqual(['user:read', 'user:update']);
    expect(role.updatedBy).toBe('admin-id');
  });

  it('does nothing when the permission set is unchanged', () => {
    const role = RoleEntity.register({
      id: 'role-id',
      name: 'SUPPORT',
      permissions: ['user:read', 'user:update'],
    });
    const updatedAtBefore = role.updatedAt;

    role.updatePermissions(['user:update', 'user:read'], 'admin-id');

    expect(role.updatedAt).toBe(updatedAtBefore);
    expect(role.updatedBy).toBeNull();
  });

  it('updates name and description', () => {
    const role = RoleEntity.register({ id: 'role-id', name: 'SUPPORT' });

    role.updateDetails('SUPPORT_LEAD', 'Leads the support team', 'admin-id');

    expect(role.name).toBe('SUPPORT_LEAD');
    expect(role.description).toBe('Leads the support team');
    expect(role.updatedBy).toBe('admin-id');
  });
});
