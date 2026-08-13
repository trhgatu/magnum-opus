import { UserEntity } from '@iam/users/domain/user.entity';
import type { IJobQueuePort } from '@shared/application/ports/job-queue.port';
import type { EmailVerificationTokenStore } from '../ports/email-verification-token-store.port';
import { EmailVerificationService } from './email-verification.service';
import type { AuthPolicy } from '../ports/auth-policy.port';
import type { OpaqueToken } from '../ports/opaque-token.port';

describe('EmailVerificationService', () => {
  it('stores only a hash and marks the mail job as sensitive', async () => {
    const tokens = {
      issue: jest.fn(),
    } as unknown as jest.Mocked<EmailVerificationTokenStore>;
    const jobs = { addJob: jest.fn() } as unknown as jest.Mocked<IJobQueuePort>;
    const authPolicy = {
      emailVerificationUrl: jest.fn(
        (token: string) =>
          `https://client.example.com/verify-email?token=${token}`,
      ),
    } as unknown as jest.Mocked<AuthPolicy>;
    const opaqueToken = {
      generate: jest.fn(() => ({ raw: 'raw-token', hash: 'hashed-token' })),
    } as unknown as jest.Mocked<OpaqueToken>;
    const service = new EmailVerificationService(
      tokens,
      jobs,
      authPolicy,
      opaqueToken,
    );
    const user = UserEntity.register({
      id: 'user-id',
      email: 'member@example.com',
      username: 'member',
      passwordHash: 'hash',
    });

    await service.schedule(user);

    expect(tokens.issue.mock.calls[0][1]).toBe('member@example.com');
    const storedHash = tokens.issue.mock.calls[0][2];
    const payload = jobs.addJob.mock.calls[0][2] as { verificationUrl: string };
    const rawToken = new URL(payload.verificationUrl).searchParams.get('token');
    expect(storedHash).toBe('hashed-token');
    expect(rawToken).toBe('raw-token');
    expect(payload.verificationUrl).not.toContain(storedHash);
    expect(jobs.addJob.mock.calls[0][3]).toEqual({ sensitive: true });
  });
});
