import type { ConfigService } from '@nestjs/config';

import { EnvironmentAuthPolicy } from './environment-auth-policy';

describe('EnvironmentAuthPolicy', () => {
  const config = {
    get: jest.fn(),
    getOrThrow: jest.fn(),
  } as unknown as jest.Mocked<ConfigService>;
  const policy = new EnvironmentAuthPolicy(config);

  beforeEach(() => {
    jest.clearAllMocks();
    config.getOrThrow.mockReturnValue('https://client.example.com');
  });

  it('reads the email verification switch from typed configuration', () => {
    config.get.mockReturnValue(true);

    expect(policy.isEmailVerificationRequired()).toBe(true);
    expect(config.get).toHaveBeenCalledWith(
      'EMAIL_VERIFICATION_REQUIRED',
      false,
    );
  });

  it('builds password reset and email verification URLs', () => {
    expect(policy.passwordResetUrl('reset token')).toBe(
      'https://client.example.com/reset-password?token=reset+token',
    );
    expect(policy.emailVerificationUrl('verify token')).toBe(
      'https://client.example.com/verify-email?token=verify+token',
    );
  });
});
