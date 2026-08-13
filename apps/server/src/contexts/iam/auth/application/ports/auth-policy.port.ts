export const AUTH_POLICY = Symbol('AUTH_POLICY');

export interface AuthPolicy {
  isEmailVerificationRequired(): boolean;
  passwordResetUrl(rawToken: string): string;
  emailVerificationUrl(rawToken: string): string;
}
