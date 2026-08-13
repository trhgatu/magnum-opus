export const USER_MAILER = Symbol('USER_MAILER');

export interface UserMailer {
  sendWelcome(email: string): Promise<boolean>;
  sendDeactivation(email: string): Promise<boolean>;
  sendPasswordReset(email: string, resetUrl: string): Promise<boolean>;
  sendEmailVerification(
    email: string,
    verificationUrl: string,
  ): Promise<boolean>;
}
