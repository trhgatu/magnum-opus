import type { Request, Response } from 'express';
import { Result } from '@shared/domain/result';
import { UserEntity } from '@iam/users/domain/user.entity';

import {
  LoginCommand,
  LogoutAllCommand,
  LogoutCommand,
  RefreshCommand,
  RegisterCommand,
  RequestEmailVerificationCommand,
  RequestPasswordResetCommand,
  ResetPasswordCommand,
  RevokeOtherSessionsCommand,
  RevokeSessionCommand,
  VerifyEmailCommand,
} from '../../application/commands';
import { GetActiveSessionsQuery } from '../../application/queries';
import { REFRESH_COOKIE } from '../refresh-cookie';
import { AuthController } from './auth.controller';

describe('AuthController', () => {
  const commandBus = { execute: jest.fn() };
  const queryBus = { execute: jest.fn() };
  const controller = new AuthController(commandBus as never, queryBus as never);

  const createRes = () =>
    ({
      cookie: jest.fn(),
      clearCookie: jest.fn(),
    }) as unknown as Response;

  beforeEach(() => jest.clearAllMocks());

  it('requests a password reset without leaking whether the account exists', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const response = await controller.requestPasswordReset({
      email: 'member@example.com',
    } as never);

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RequestPasswordResetCommand('member@example.com'),
    );
    expect(response.accepted).toBe(true);
  });

  it('confirms a password reset', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.resetPassword({
      token: 'reset-token',
      password: 'a-new-strong-password',
    } as never);

    expect(commandBus.execute).toHaveBeenCalledWith(
      new ResetPasswordCommand('reset-token', 'a-new-strong-password'),
    );
    expect(response).toEqual({ success: true });
  });

  it('requests email verification without leaking account state', async () => {
    commandBus.execute.mockResolvedValue(undefined);

    const response = await controller.requestEmailVerification({
      email: 'member@example.com',
    } as never);

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RequestEmailVerificationCommand('member@example.com'),
    );
    expect(response.accepted).toBe(true);
  });

  it('confirms email verification', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.verifyEmail({
      token: 'a'.repeat(32),
    } as never);

    expect(commandBus.execute).toHaveBeenCalledWith(
      new VerifyEmailCommand('a'.repeat(32)),
    );
    expect(response).toEqual({ success: true });
  });

  it('registers a user and reports whether verification is still required', async () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      emailVerifiedAt: null,
    });
    commandBus.execute.mockResolvedValue(Result.ok(user));

    const response = await controller.register({
      email: 'member@example.com',
      username: 'member',
      password: 'a-strong-password',
    } as never);

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RegisterCommand({
        email: 'member@example.com',
        username: 'member',
        passwordRaw: 'a-strong-password',
      }),
    );
    expect(response.emailVerificationRequired).toBe(true);
    expect(response).not.toHaveProperty('password');
  });

  it('logs in, sets the refresh cookie, and returns both tokens', async () => {
    commandBus.execute.mockResolvedValue(
      Result.ok({ accessToken: 'access', refreshToken: 'refresh' }),
    );
    const res = createRes();

    const response = await controller.login(
      { email: 'member@example.com', password: 'a-strong-password' } as never,
      { ip: '127.0.0.1', userAgent: 'Mozilla' },
      res,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      new LoginCommand(
        'member@example.com',
        'a-strong-password',
        '127.0.0.1',
        'Mozilla',
      ),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'refresh',
      expect.any(Object),
    );
    expect(response).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
  });

  it('omits the refresh token from the body when the client authenticates by cookie', async () => {
    commandBus.execute.mockResolvedValue(
      Result.ok({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    );
    const res = createRes();
    const req = {
      cookies: { [REFRESH_COOKIE]: 'old-refresh' },
      headers: {},
    } as unknown as Request;

    const response = await controller.refresh(
      'user-id',
      'member@example.com',
      'jti-1',
      req,
      res,
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RefreshCommand('user-id', 'member@example.com', 'jti-1'),
    );
    expect(res.cookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      'new-refresh',
      expect.any(Object),
    );
    expect(response).toEqual({ accessToken: 'new-access' });
  });

  it('returns both tokens when the client authenticates without a cookie', async () => {
    commandBus.execute.mockResolvedValue(
      Result.ok({ accessToken: 'new-access', refreshToken: 'new-refresh' }),
    );
    const res = createRes();
    const req = { cookies: {}, headers: {} } as unknown as Request;

    const response = await controller.refresh(
      'user-id',
      'member@example.com',
      'jti-1',
      req,
      res,
    );

    expect(response).toEqual({
      accessToken: 'new-access',
      refreshToken: 'new-refresh',
    });
  });

  it('logs out of the current session and clears the refresh cookie', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));
    const res = createRes();

    const response = await controller.logout('user-id', 'jti-1', res);

    expect(commandBus.execute).toHaveBeenCalledWith(
      new LogoutCommand({ userId: 'user-id', jti: 'jti-1' }),
    );
    expect(res.clearCookie).toHaveBeenCalledWith(
      REFRESH_COOKIE,
      expect.any(Object),
    );
    expect(response).toEqual({ success: true });
  });

  it('logs out of every session and clears the refresh cookie', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));
    const res = createRes();

    const response = await controller.logoutAll('user-id', res);

    expect(commandBus.execute).toHaveBeenCalledWith(
      new LogoutAllCommand({ userId: 'user-id' }),
    );
    expect(res.clearCookie).toHaveBeenCalled();
    expect(response).toEqual({ success: true });
  });

  it('revokes every session except the current one', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.revokeOtherSessions(
      'user-id',
      'session-1',
    );

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RevokeOtherSessionsCommand('user-id', 'session-1'),
    );
    expect(response).toEqual({ success: true });
  });

  it('lists active sessions with pagination metadata', async () => {
    queryBus.execute.mockResolvedValue(
      Result.ok({ sessions: [{ jti: 'jti-1' }], total: 1 }),
    );

    const response = await controller.getSessions('user-id', 'jti-1', {
      page: 1,
      limit: 10,
    } as never);

    expect(queryBus.execute).toHaveBeenCalledWith(
      new GetActiveSessionsQuery('user-id', 1, 10, 'jti-1'),
    );
    expect(response.meta).toEqual({
      totalItems: 1,
      itemCount: 1,
      itemsPerPage: 10,
      totalPages: 1,
      currentPage: 1,
    });
  });

  it('revokes a session by jti', async () => {
    commandBus.execute.mockResolvedValue(Result.ok(undefined));

    const response = await controller.revokeSession('user-id', 'jti-1');

    expect(commandBus.execute).toHaveBeenCalledWith(
      new RevokeSessionCommand({ userId: 'user-id', jti: 'jti-1' }),
    );
    expect(response).toEqual({ success: true });
  });
});
