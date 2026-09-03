import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { EmailVerificationTokenStore } from '../../ports/email-verification-token-store.port';
import { InvalidEmailVerificationTokenException } from '../../../domain/exceptions/invalid-email-verification-token.exception';
import { VerifyEmailCommand } from '../verify-email.command';
import { VerifyEmailHandler } from './verify-email.handler';
import type { OpaqueToken } from '../../ports/opaque-token.port';

describe('VerifyEmailHandler', () => {
  const tokens = {
    consume: jest.fn(),
  } as unknown as jest.Mocked<EmailVerificationTokenStore>;
  const users = {
    markEmailVerified: jest.fn(),
  } as unknown as jest.Mocked<UserRepository>;
  const opaqueToken = {
    hash: jest.fn((raw: string) => `hash:${raw}`),
  } as unknown as jest.Mocked<OpaqueToken>;
  const handler = new VerifyEmailHandler(tokens, users, opaqueToken);

  beforeEach(() => jest.clearAllMocks());

  it('rejects an invalid, expired, or reused token uniformly', async () => {
    tokens.consume.mockResolvedValue(null);
    const result = await handler.execute(new VerifyEmailCommand('invalid'));
    expect(result.getError()).toBeInstanceOf(
      InvalidEmailVerificationTokenException,
    );
  });

  it('marks the token owner verified after atomic consumption', async () => {
    tokens.consume.mockResolvedValue({
      userId: 'user-id',
      email: 'member@example.com',
    });
    users.markEmailVerified.mockResolvedValue(true);
    await handler.execute(new VerifyEmailCommand('valid-token'));
    expect(tokens.consume).toHaveBeenCalledWith(
      'hash:valid-token',
      expect.any(Date),
    );
    expect(users.markEmailVerified).toHaveBeenCalledWith(
      'user-id',
      'member@example.com',
      expect.any(Date),
    );
  });

  it('rejects a token when the account email changed after issuance', async () => {
    tokens.consume.mockResolvedValue({
      userId: 'user-id',
      email: 'old@example.com',
    });
    users.markEmailVerified.mockResolvedValue(false);

    const result = await handler.execute(
      new VerifyEmailCommand('valid-old-token'),
    );
    expect(result.getError()).toBeInstanceOf(
      InvalidEmailVerificationTokenException,
    );
    expect(users.markEmailVerified).toHaveBeenCalledWith(
      'user-id',
      'old@example.com',
      expect.any(Date),
    );
  });
});
