import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/application/ports/password-hasher.port';
import { UserEntity } from '@iam/users/domain/user.entity';
import { InvalidCredentialsException } from '@iam/users/domain/exceptions/invalid-credentials.exception';
import { UserDeactivatedException } from '@iam/users/domain/exceptions/user-deactivated.exception';

import type { ISessionStore } from '../../ports/session-store.port';
import type { AuthTokenIssuer } from '../../ports/auth-token-issuer.port';
import type { AuthPolicy } from '../../ports/auth-policy.port';
import { EmailNotVerifiedException } from '../../../domain/exceptions/email-not-verified.exception';
import { LoginCommand } from '../login.command';
import { LoginCommandHandler } from './login.handler';

describe('LoginCommandHandler', () => {
  const createUser = (overrides?: {
    isActive?: boolean;
    emailVerifiedAt?: Date | null;
  }) => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      emailVerifiedAt:
        overrides?.emailVerifiedAt === undefined
          ? new Date()
          : overrides.emailVerifiedAt,
    });
    if (overrides?.isActive === false) user.deactivate();
    return user;
  };

  const createHandler = (options?: {
    user?: UserEntity | null;
    passwordMatches?: boolean;
    emailVerificationRequired?: boolean;
  }) => {
    const resolvedUser =
      options?.user === undefined ? createUser() : options.user;
    const users = {
      findByEmail: jest.fn().mockResolvedValue(resolvedUser),
      getPermissions: jest.fn().mockResolvedValue(['user:read']),
      nextIdentity: jest.fn().mockReturnValue('jti-1'),
    } as unknown as jest.Mocked<UserRepository>;
    const hasher = {
      compare: jest.fn().mockResolvedValue(options?.passwordMatches ?? true),
    } as unknown as jest.Mocked<PasswordHasher>;
    const tokenIssuer = {
      issue: jest
        .fn()
        .mockReturnValue({ accessToken: 'access', refreshToken: 'refresh' }),
    } as unknown as jest.Mocked<AuthTokenIssuer>;
    const sessions = {
      saveRefreshToken: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<ISessionStore>;
    const authPolicy = {
      isEmailVerificationRequired: jest
        .fn()
        .mockReturnValue(options?.emailVerificationRequired ?? false),
    } as unknown as jest.Mocked<AuthPolicy>;

    return {
      handler: new LoginCommandHandler(
        users,
        hasher,
        tokenIssuer,
        sessions,
        authPolicy,
      ),
      users,
      hasher,
      tokenIssuer,
      sessions,
    };
  };

  it('fails with invalid credentials when the email is unknown', async () => {
    const { handler } = createHandler({ user: null });

    const result = await handler.execute(
      new LoginCommand('member@example.com', 'password123'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsException);
  });

  it('fails when the account has been deactivated', async () => {
    const { handler } = createHandler({
      user: createUser({ isActive: false }),
    });

    const result = await handler.execute(
      new LoginCommand('member@example.com', 'password123'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserDeactivatedException);
  });

  it('fails with invalid credentials when the password does not match', async () => {
    const { handler } = createHandler({ passwordMatches: false });

    const result = await handler.execute(
      new LoginCommand('member@example.com', 'wrong-password'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(InvalidCredentialsException);
  });

  it('fails when email verification is required but missing', async () => {
    const { handler } = createHandler({
      user: createUser({ emailVerifiedAt: null }),
      emailVerificationRequired: true,
    });

    const result = await handler.execute(
      new LoginCommand('member@example.com', 'password123'),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(EmailNotVerifiedException);
  });

  it('issues tokens and persists the refresh session on success', async () => {
    const { handler, tokenIssuer, sessions } = createHandler();

    const result = await handler.execute(
      new LoginCommand(
        'member@example.com',
        'password123',
        'test-client-ip',
        'Mozilla',
      ),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue()).toEqual({
      accessToken: 'access',
      refreshToken: 'refresh',
    });
    expect(tokenIssuer.issue).toHaveBeenCalledWith(
      expect.objectContaining({
        userId: 'user-id',
        email: 'member@example.com',
        permissions: ['user:read'],
        jti: 'jti-1',
      }),
    );
    expect(sessions.saveRefreshToken).toHaveBeenCalledWith(
      'user-id',
      'jti-1',
      expect.objectContaining({ ip: 'test-client-ip', userAgent: 'Mozilla' }),
      expect.any(Number),
    );
  });
});
