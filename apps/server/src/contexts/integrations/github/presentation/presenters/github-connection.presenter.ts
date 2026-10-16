import type { GitHubConnectionResponse } from '@repo/contracts';
import type { GitHubConnection } from '../../domain/github-connection.entity';

export class GitHubConnectionPresenter {
  /** Không bao giờ có token, kể cả dạng đã mã hóa. */
  static toResponse(
    connection: GitHubConnection,
    now: Date,
  ): GitHubConnectionResponse {
    return {
      accountLogin: connection.account.login,
      status: connection.statusAt(now),
      expiresAt: connection.expiresAt?.toISOString() ?? null,
      lastVerifiedAt: connection.lastVerifiedAt.toISOString(),
      connectedAt: connection.createdAt.toISOString(),
    };
  }
}
