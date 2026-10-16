import type { GitHubAccount } from '../../domain/github-connection.entity';

export const GITHUB_API = Symbol('GITHUB_API');

export interface VerifiedGitHubToken {
  account: GitHubAccount;
  /** null: token không hết hạn hoặc GitHub không cho biết. */
  expiresAt: Date | null;
}

export interface GitHubApi {
  /**
   * Ném GitHubTokenInvalidException, GitHubTokenInsufficientScopeException,
   * GitHubRateLimitedException hoặc GitHubUnavailableException.
   */
  verifyToken(token: string): Promise<VerifiedGitHubToken>;
  /** Ném GitHubTokenInvalidException, GitHubRateLimitedException hoặc GitHubUnavailableException. */
  listRepositories(token: string): Promise<GitHubRepositoryList>;
}

export interface GitHubRepository {
  /** databaseId của GitHub, dạng chuỗi — dùng làm externalResourceId. */
  id: string;
  fullName: string;
  isPrivate: boolean;
  pushedAt: Date | null;
}

export interface GitHubRepositoryList {
  repositories: GitHubRepository[];
  /** false: dừng ở giới hạn số trang, còn repository chưa đọc. */
  complete: boolean;
}
