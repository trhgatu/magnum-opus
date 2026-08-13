import { USER_JOBS } from '../jobs/user-email.jobs';
import type { UserMailer } from '../ports/user-mailer.port';
import { UserEmailJobService } from './user-email-job.service';

describe('UserEmailJobService', () => {
  const mailer = {
    sendWelcome: jest.fn(),
    sendDeactivation: jest.fn(),
    sendPasswordReset: jest.fn(),
    sendEmailVerification: jest.fn(),
  } as unknown as jest.Mocked<UserMailer>;
  const service = new UserEmailJobService(mailer);

  beforeEach(() => {
    jest.clearAllMocks();
    mailer.sendWelcome.mockResolvedValue(true);
    mailer.sendDeactivation.mockResolvedValue(true);
    mailer.sendPasswordReset.mockResolvedValue(true);
    mailer.sendEmailVerification.mockResolvedValue(true);
  });

  it.each([
    [USER_JOBS.SEND_WELCOME_EMAIL, 'sendWelcome'],
    [USER_JOBS.SEND_DEACTIVATION_EMAIL, 'sendDeactivation'],
  ] as const)('dispatches %s to the mailer', async (jobName, method) => {
    const result = await service.execute(jobName, {
      email: 'member@example.com',
    });

    expect(mailer[method]).toHaveBeenCalledWith('member@example.com');
    expect(result).toEqual({ sent: true, email: 'member@example.com' });
  });

  it('dispatches password reset with its required URL', async () => {
    await service.execute(USER_JOBS.SEND_PASSWORD_RESET_EMAIL, {
      email: 'member@example.com',
      resetUrl: 'https://client.example.com/reset?token=one-time',
    });

    expect(mailer.sendPasswordReset).toHaveBeenCalledWith(
      'member@example.com',
      'https://client.example.com/reset?token=one-time',
    );
  });

  it('rejects a password reset job without resetUrl', async () => {
    await expect(
      service.execute(USER_JOBS.SEND_PASSWORD_RESET_EMAIL, {
        email: 'member@example.com',
      }),
    ).rejects.toThrow('Password reset job is missing resetUrl');
    expect(mailer.sendPasswordReset).not.toHaveBeenCalled();
  });

  it('dispatches email verification with its required URL', async () => {
    await service.execute(USER_JOBS.SEND_EMAIL_VERIFICATION, {
      email: 'member@example.com',
      verificationUrl: 'https://client.example.com/verify?token=one-time',
    });

    expect(mailer.sendEmailVerification).toHaveBeenCalledWith(
      'member@example.com',
      'https://client.example.com/verify?token=one-time',
    );
  });

  it('preserves the mailer skipped result when delivery is disabled', async () => {
    mailer.sendWelcome.mockResolvedValue(false);

    const result = await service.execute(USER_JOBS.SEND_WELCOME_EMAIL, {
      email: 'member@example.com',
    });

    expect(result).toEqual({ sent: false, email: 'member@example.com' });
  });
});
