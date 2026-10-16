import type { GitHubAccount } from '../../domain/github-connection.entity';

export const GITHUB_API = Symbol('GITHUB_API');

export interface VerifiedGitHubToken {
  account: GitHubAccount;
  /** null: token không hết hạn hoặc GitHub không cho biết. */
  expiresAt: Date | null;
}

export interface GitHubApi {
  /** Ném GitHubTokenInvalid / InsufficientScope / RateLimited / Unavailable. */
  verifyToken(token: string): Promise<VerifiedGitHubToken>;
}
