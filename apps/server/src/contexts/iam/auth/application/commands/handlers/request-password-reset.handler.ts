import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, type ICommandHandler } from '@nestjs/cqrs';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '@iam/users/domain/ports/user.repository';
import {
  JOB_QUEUE_PORT,
  type IJobQueuePort,
} from '@shared/application/ports/job-queue.port';
import {
  USER_JOBS,
  USER_QUEUE,
} from '@iam/users/application/jobs/user-email.jobs';
import {
  PASSWORD_RESET_TOKEN_STORE,
  type PasswordResetTokenStore,
} from '../../ports/password-reset-token-store.port';
import { RequestPasswordResetCommand } from '../request-password-reset.command';
import { AUTH_POLICY, type AuthPolicy } from '../../ports/auth-policy.port';
import { OPAQUE_TOKEN, type OpaqueToken } from '../../ports/opaque-token.port';

const RESET_TOKEN_TTL_MS = 30 * 60 * 1_000;

@CommandHandler(RequestPasswordResetCommand)
export class RequestPasswordResetHandler implements ICommandHandler<
  RequestPasswordResetCommand,
  void
> {
  private readonly logger = new Logger(RequestPasswordResetHandler.name);

  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
    @Inject(PASSWORD_RESET_TOKEN_STORE)
    private readonly tokens: PasswordResetTokenStore,
    @Inject(JOB_QUEUE_PORT) private readonly jobs: IJobQueuePort,
    @Inject(AUTH_POLICY) private readonly authPolicy: AuthPolicy,
    @Inject(OPAQUE_TOKEN) private readonly opaqueToken: OpaqueToken,
  ) {}

  async execute(command: RequestPasswordResetCommand): Promise<void> {
    const user = await this.users.findByEmail(
      command.email.trim().toLowerCase(),
    );
    if (!user?.isActive || user.isDeleted) return;

    try {
      const token = this.opaqueToken.generate();
      await this.tokens.issue(
        user.id,
        token.hash,
        new Date(Date.now() + RESET_TOKEN_TTL_MS),
      );
      await this.jobs.addJob(
        USER_QUEUE,
        USER_JOBS.SEND_PASSWORD_RESET_EMAIL,
        {
          email: user.email,
          resetUrl: this.authPolicy.passwordResetUrl(token.raw),
        },
        { sensitive: true },
      );
    } catch (error) {
      this.logger.error(
        'Password reset request could not be scheduled',
        error instanceof Error ? error.stack : undefined,
      );
    }
  }
}
