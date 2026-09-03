import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/application/ports/password-hasher.port';
import type { ISessionStore } from '../../ports/session-store.port';
import type { PasswordResetTokenStore } from '../../ports/password-reset-token-store.port';
import { InvalidPasswordResetTokenException } from '../../../domain/exceptions/invalid-password-reset-token.exception';
import { ResetPasswordCommand } from '../reset-password.command';
import { ResetPasswordHandler } from './reset-password.handler';
import type { OpaqueToken } from '../../ports/opaque-token.port';

describe('ResetPasswordHandler', () => {
  const tokens = {
    consume: jest.fn(),
  } as unknown as jest.Mocked<PasswordResetTokenStore>;
  const users = {
    changePassword: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const hasher = { hash: jest.fn() } as unknown as jest.Mocked<PasswordHasher>;
  const sessions = {
    revokeAllUserSessions: jest.fn(),
  } as unknown as jest.Mocked<ISessionStore>;
  const opaqueToken = {
    hash: jest.fn((raw: string) => `hash:${raw}`),
  } as unknown as jest.Mocked<OpaqueToken>;
  const handler = new ResetPasswordHandler(
    tokens,
    users,
    hasher,
    sessions,
    opaqueToken,
  );

  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid, expired, or already-consumed token uniformly', async () => {
    tokens.consume.mockResolvedValue(null);
    const result = await handler.execute(
      new ResetPasswordCommand('invalid', 'new-password-123'),
    );
    expect(result.getError()).toBeInstanceOf(
      InvalidPasswordResetTokenException,
    );
    expect(users.changePassword).not.toHaveBeenCalled();
  });

  it('changes the password, bumps tokenVersion, and revokes every session', async () => {
    tokens.consume.mockResolvedValue('user-id');
    hasher.hash.mockResolvedValue('new-hash');
    users.changePassword.mockResolvedValue(true);

    await handler.execute(
      new ResetPasswordCommand('valid-token', 'new-password-123'),
    );

    expect(tokens.consume).toHaveBeenCalledWith(
      'hash:valid-token',
      expect.any(Date),
    );
    expect(sessions.revokeAllUserSessions).toHaveBeenCalledWith('user-id');
    expect(users.changePassword).toHaveBeenCalledWith('user-id', 'new-hash');
    expect(
      sessions.revokeAllUserSessions.mock.invocationCallOrder[0],
    ).toBeLessThan(users.changePassword.mock.invocationCallOrder[0]);
  });
});
