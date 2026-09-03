import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';

import type { ISessionStore } from '../../ports/session-store.port';
import { LogoutAllCommand } from '../logout-all.command';
import { LogoutAllCommandHandler } from './logout-all.handler';

describe('LogoutAllCommandHandler', () => {
  const createSessionStore = () =>
    ({
      revokeAllUserSessions: jest.fn().mockResolvedValue(undefined),
    }) as unknown as jest.Mocked<ISessionStore>;

  it('revokes every refresh session and bumps the tokenVersion', async () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
    });
    const tokenVersionBefore = user.tokenVersion;
    const sessionStore = createSessionStore();
    const users = {
      findById: jest.fn().mockResolvedValue(user),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserRepository>;
    const handler = new LogoutAllCommandHandler(sessionStore, users);

    const result = await handler.execute(
      new LogoutAllCommand({ userId: 'user-id' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(sessionStore.revokeAllUserSessions).toHaveBeenCalledWith('user-id');
    expect(user.tokenVersion).toBe(tokenVersionBefore + 1);
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('still revokes sessions when the user no longer exists', async () => {
    const sessionStore = createSessionStore();
    const users = {
      findById: jest.fn().mockResolvedValue(null),
      save: jest.fn(),
    } as unknown as jest.Mocked<UserRepository>;
    const handler = new LogoutAllCommandHandler(sessionStore, users);

    const result = await handler.execute(
      new LogoutAllCommand({ userId: 'missing-id' }),
    );

    expect(result.isSuccess).toBe(true);
    expect(sessionStore.revokeAllUserSessions).toHaveBeenCalledWith(
      'missing-id',
    );
    expect(users.save).not.toHaveBeenCalled();
  });
});
