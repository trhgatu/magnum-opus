import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

import type { AuthPolicy } from '../../application/ports/auth-policy.port';

@Injectable()
export class EnvironmentAuthPolicy implements AuthPolicy {
  constructor(private readonly config: ConfigService) {}

  public isEmailVerificationRequired(): boolean {
    return this.config.get<boolean>('EMAIL_VERIFICATION_REQUIRED', false);
  }

  public passwordResetUrl(rawToken: string): string {
    return this.actionUrl('/reset-password', rawToken);
  }

  public emailVerificationUrl(rawToken: string): string {
    return this.actionUrl('/verify-email', rawToken);
  }

  private actionUrl(path: string, rawToken: string): string {
    const url = new URL(path, this.config.getOrThrow<string>('CLIENT_URL'));
    url.searchParams.set('token', rawToken);
    return url.toString();
  }
}
