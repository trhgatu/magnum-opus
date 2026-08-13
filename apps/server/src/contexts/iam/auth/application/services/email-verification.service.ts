import { Inject, Injectable, Logger } from '@nestjs/common';
import type { UserEntity } from '@iam/users/domain/user.entity';
import {
  JOB_QUEUE_PORT,
  type IJobQueuePort,
} from '@shared/application/ports/job-queue.port';
import {
  USER_JOBS,
  USER_QUEUE,
} from '@iam/users/application/queues/user-queue.constants';
import {
  EMAIL_VERIFICATION_TOKEN_STORE,
  type EmailVerificationTokenStore,
} from '../ports/email-verification-token-store.port';
import { AUTH_POLICY, type AuthPolicy } from '../ports/auth-policy.port';
import { OPAQUE_TOKEN, type OpaqueToken } from '../ports/opaque-token.port';

const VERIFICATION_TOKEN_TTL_MS = 24 * 60 * 60 * 1_000;

@Injectable()
export class EmailVerificationService {
  private readonly logger = new Logger(EmailVerificationService.name);

  constructor(
    @Inject(EMAIL_VERIFICATION_TOKEN_STORE)
    private readonly tokens: EmailVerificationTokenStore,
    @Inject(JOB_QUEUE_PORT) private readonly jobs: IJobQueuePort,
    @Inject(AUTH_POLICY) private readonly authPolicy: AuthPolicy,
    @Inject(OPAQUE_TOKEN) private readonly opaqueToken: OpaqueToken,
  ) {}

  async schedule(user: UserEntity): Promise<void> {
    try {
      const token = this.opaqueToken.generate();
      await this.tokens.issue(
        user.id,
        user.email,
        token.hash,
        new Date(Date.now() + VERIFICATION_TOKEN_TTL_MS),
      );
      await this.jobs.addJob(
        USER_QUEUE,
        USER_JOBS.SEND_EMAIL_VERIFICATION,
        {
          email: user.email,
          verificationUrl: this.authPolicy.emailVerificationUrl(token.raw),
        },
        { sensitive: true },
      );
    } catch (error) {
      this.logger.error(
        'Email verification could not be scheduled',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
