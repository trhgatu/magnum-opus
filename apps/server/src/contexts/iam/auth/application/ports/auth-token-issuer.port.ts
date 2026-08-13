export const AUTH_TOKEN_ISSUER = Symbol('AUTH_TOKEN_ISSUER');

export interface IssueAuthTokensInput {
  userId: string;
  email: string;
  permissions: string[];
  tokenVersion: number;
  jti: string;
  refreshTtlSeconds: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface AuthTokenIssuer {
  issue(input: IssueAuthTokensInput): AuthTokens;
}
