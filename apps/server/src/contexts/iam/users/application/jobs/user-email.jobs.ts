export const USER_QUEUE = 'user-queue';

export const USER_JOBS = {
  SEND_WELCOME_EMAIL: 'send-welcome-email',
  SEND_DEACTIVATION_EMAIL: 'send-deactivation-email',
  SEND_PASSWORD_RESET_EMAIL: 'send-password-reset-email',
  SEND_EMAIL_VERIFICATION: 'send-email-verification',
} as const;

export type UserJobName = (typeof USER_JOBS)[keyof typeof USER_JOBS];

export const isUserJobName = (value: string): value is UserJobName =>
  Object.values(USER_JOBS).some((name) => name === value);

export interface UserEmailJobData {
  email: string;
  resetUrl?: string;
  verificationUrl?: string;
  correlationId?: string;
}

export interface UserEmailJobResult {
  sent: boolean;
  email: string;
}
