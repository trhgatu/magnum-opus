import { UserEntity } from '../../domain/user.entity';
import { UserPresenter } from './user.presenter';

describe('UserPresenter', () => {
  it('maps a user to a response shape that excludes credentials', () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      avatar: 'https://example.com/avatar.png',
      roles: ['USER'],
      createdBy: 'admin-id',
    });

    const response = UserPresenter.toResponse(user);

    expect(response).toEqual({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      avatar: 'https://example.com/avatar.png',
      isActive: true,
      isDeleted: false,
      roles: ['USER'],
      createdAt: user.createdAt,
      updatedAt: user.updatedAt,
      createdBy: 'admin-id',
      updatedBy: null,
    });
    expect(response).not.toHaveProperty('password');
    expect(response).not.toHaveProperty('tokenVersion');
    expect(response).not.toHaveProperty('emailVerifiedAt');
  });

  it('defaults roles to an empty array when absent', () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
    });
    jest.spyOn(user, 'toPrimitives').mockReturnValue({
      ...user.toPrimitives(),
      roles: undefined as never,
    });

    expect(UserPresenter.toResponse(user).roles).toEqual([]);
  });
});
