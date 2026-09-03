import type { Request } from 'express';
import type { ConfigService } from '@nestjs/config';
import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';

import type { ISessionStore } from '../../application/ports/session-store.port';
import { JwtRefreshStrategy } from './jwt-refresh.strategy';

describe('JwtRefreshStrategy', () => {
  const config = {
    getOrThrow: jest.fn().mockReturnValue('test-refresh-secret'),
  } as unknown as ConfigService;

  const payload = { sub: 'user-id', email: 'member@example.com', jti: 'jti-1' };

  const createUser = (overrides?: { isActive?: boolean }) => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
    });
    if (overrides?.isActive === false) user.deactivate();
    return user;
  };

  const createRequest = (options?: { authHeader?: string }): Request =>
    ({
      cookies: {},
      headers: {},
      get: jest.fn().mockReturnValue(options?.authHeader),
    }) as unknown as Request;

  const createStrategy = (options?: {
    user?: UserEntity | null;
    session?: unknown;
    replay?: unknown;
  }) => {
    const users = {
      findById: jest
        .fn()
        .mockResolvedValue(
          options?.user === undefined ? createUser() : options.user,
        ),
    } as unknown as jest.Mocked<UserRepository>;
    const sessions = {
      getRefreshTokenSession: jest
        .fn()
        .mockResolvedValue(options?.session ?? null),
      getRefreshReplay: jest.fn().mockResolvedValue(options?.replay ?? null),
    } as unknown as jest.Mocked<ISessionStore>;

    return {
      strategy: new JwtRefreshStrategy(users, sessions, config),
      sessions,
    };
  };

  it('rejects when the user no longer exists', async () => {
    const { strategy } = createStrategy({ user: null });

    await expect(strategy.validate(createRequest(), payload)).rejects.toThrow(
      'User is inactive or no longer exists',
    );
  });

  it('rejects a deactivated user', async () => {
    const { strategy } = createStrategy({
      user: createUser({ isActive: false }),
    });

    await expect(strategy.validate(createRequest(), payload)).rejects.toThrow(
      'User is inactive or no longer exists',
    );
  });

  it('rejects when the refresh session has been revoked and there is no replay', async () => {
    const { strategy } = createStrategy({ session: null, replay: null });

    await expect(strategy.validate(createRequest(), payload)).rejects.toThrow(
      'Refresh token has been revoked or expired',
    );
  });

  it('accepts a token that matches a replayed rotation', async () => {
    const { strategy } = createStrategy({
      session: null,
      replay: { accessToken: 'a', refreshToken: 'r' },
    });

    const principal = await strategy.validate(createRequest(), payload);

    expect(principal).toMatchObject({ id: 'user-id', jti: 'jti-1' });
  });

  it('returns the authenticated principal for a valid session', async () => {
    const { strategy } = createStrategy({
      session: { jti: 'jti-1', sessionId: 'session-1' },
    });

    const principal = await strategy.validate(
      createRequest({ authHeader: 'Bearer raw-refresh-token' }),
      payload,
    );

    expect(principal).toEqual({
      id: 'user-id',
      email: 'member@example.com',
      roles: ['USER'],
      jti: 'jti-1',
      sessionId: 'session-1',
      refreshToken: 'raw-refresh-token',
    });
  });
});
