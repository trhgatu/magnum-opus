import { Inject, Injectable } from '@nestjs/common';

import {
  USER_JOBS,
  type UserEmailJobData,
  type UserEmailJobResult,
  type UserJobName,
} from '../jobs/user-email.jobs';
import { USER_MAILER, type UserMailer } from '../ports/user-mailer.port';

@Injectable()
export class UserEmailJobService {
  constructor(@Inject(USER_MAILER) private readonly mailer: UserMailer) {}

  public async execute(
    name: UserJobName,
    data: UserEmailJobData,
  ): Promise<UserEmailJobResult> {
    const sent = await this.dispatch(name, data);
    return { sent, email: data.email };
  }

  private dispatch(
    name: UserJobName,
    data: UserEmailJobData,
  ): Promise<boolean> {
    switch (name) {
      case USER_JOBS.SEND_WELCOME_EMAIL:
        return this.mailer.sendWelcome(data.email);
      case USER_JOBS.SEND_DEACTIVATION_EMAIL:
        return this.mailer.sendDeactivation(data.email);
      case USER_JOBS.SEND_PASSWORD_RESET_EMAIL:
        if (!data.resetUrl) {
          throw new Error('Password reset job is missing resetUrl');
        }
        return this.mailer.sendPasswordReset(data.email, data.resetUrl);
      case USER_JOBS.SEND_EMAIL_VERIFICATION:
        if (!data.verificationUrl) {
          throw new Error('Email verification job is missing verificationUrl');
        }
        return this.mailer.sendEmailVerification(
          data.email,
          data.verificationUrl,
        );
    }
  }
}
