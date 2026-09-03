import type { UserRepository } from '@iam/users/domain/ports/user.repository';
import { UserEntity } from '@iam/users/domain/user.entity';

import type { EmailVerificationService } from '../../services/email-verification.service';
import { RequestEmailVerificationCommand } from '../request-email-verification.command';
import { RequestEmailVerificationHandler } from './request-email-verification.handler';

describe('RequestEmailVerificationHandler', () => {
  const createHandler = (user: UserEntity | null) => {
    const users = {
      findByEmail: jest.fn().mockResolvedValue(user),
    } as unknown as jest.Mocked<UserRepository>;
    const verification = {
      schedule: jest.fn().mockResolvedValue(undefined),
    } as unknown as jest.Mocked<EmailVerificationService>;

    return {
      handler: new RequestEmailVerificationHandler(users, verification),
      users,
      verification,
    };
  };

  it('normalizes the email before looking up the user', async () => {
    const { handler, users } = createHandler(null);

    await handler.execute(
      new RequestEmailVerificationCommand('  Member@Example.com  '),
    );

    expect(users.findByEmail).toHaveBeenCalledWith('member@example.com');
  });

  it('does nothing when no user matches the email', async () => {
    const { handler, verification } = createHandler(null);

    await handler.execute(
      new RequestEmailVerificationCommand('member@example.com'),
    );

    expect(verification.schedule).not.toHaveBeenCalled();
  });

  it('does nothing when the user is inactive', async () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      emailVerifiedAt: null,
    });
    user.deactivate();
    const { handler, verification } = createHandler(user);

    await handler.execute(
      new RequestEmailVerificationCommand('member@example.com'),
    );

    expect(verification.schedule).not.toHaveBeenCalled();
  });

  it('does nothing when the email is already verified', async () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      emailVerifiedAt: new Date(),
    });
    const { handler, verification } = createHandler(user);

    await handler.execute(
      new RequestEmailVerificationCommand('member@example.com'),
    );

    expect(verification.schedule).not.toHaveBeenCalled();
  });

  it('schedules verification for an active, unverified user', async () => {
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hashed-password',
      emailVerifiedAt: null,
    });
    const { handler, verification } = createHandler(user);

    await handler.execute(
      new RequestEmailVerificationCommand('member@example.com'),
    );

    expect(verification.schedule).toHaveBeenCalledWith(user);
  });
});
