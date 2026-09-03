import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import type { PasswordHasher } from '@iam/users/application/ports/password-hasher.port';
import { UserAlreadyExistsException } from '@iam/users/domain/exceptions/user-already-exists.exception';

import type { AuthPolicy } from '../../ports/auth-policy.port';
import type { EmailVerificationService } from '../../services/email-verification.service';
import { RegisterCommand } from '../register.command';
import { RegisterHandler } from './register.handler';

describe('RegisterHandler', () => {
  const createHandler = (options?: {
    existingUser?: unknown;
    emailVerificationRequired?: boolean;
  }) => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(options?.existingUser ?? null),
      nextIdentity: jest.fn().mockReturnValue('new-user-id'),
      save: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<UserRepository>;
    const hasher = {
      hash: jest.fn().mockResolvedValue('hashed-password'),
    } as unknown as jest.Mocked<PasswordHasher>;
    const authPolicy = {
      isEmailVerificationRequired: jest
        .fn()
        .mockReturnValue(options?.emailVerificationRequired ?? true),
    } as unknown as jest.Mocked<AuthPolicy>;
    const verification = {
      schedule: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailVerificationService>;

    return {
      handler: new RegisterHandler(users, hasher, authPolicy, verification),
      users,
      hasher,
      verification,
    };
  };

  it('fails when the email is already registered', async () => {
    const { handler, users } = createHandler({ existingUser: { id: 'x' } });

    const result = await handler.execute(
      new RegisterCommand({
        email: 'member@example.com',
        username: 'member',
        passwordRaw: 'a-strong-password',
      }),
    );

    expect(result.isFailure).toBe(true);
    expect(result.getError()).toBeInstanceOf(UserAlreadyExistsException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('registers an unverified user and schedules verification when required', async () => {
    const { handler, users, hasher, verification } = createHandler({
      emailVerificationRequired: true,
    });

    const result = await handler.execute(
      new RegisterCommand({
        email: 'member@example.com',
        username: 'member',
        passwordRaw: 'a-strong-password',
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(hasher.hash).toHaveBeenCalledWith('a-strong-password');
    const user = result.getValue();
    expect(user.emailVerifiedAt).toBeNull();
    expect(users.save).toHaveBeenCalledWith(user);
    expect(verification.schedule).toHaveBeenCalledWith(user);
  });

  it('registers an already-verified user and skips verification when not required', async () => {
    const { handler, verification } = createHandler({
      emailVerificationRequired: false,
    });

    const result = await handler.execute(
      new RegisterCommand({
        email: 'member@example.com',
        username: 'member',
        passwordRaw: 'a-strong-password',
      }),
    );

    expect(result.isSuccess).toBe(true);
    expect(result.getValue().emailVerifiedAt).not.toBeNull();
    expect(verification.schedule).not.toHaveBeenCalled();
  });
});
