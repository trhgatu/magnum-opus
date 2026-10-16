import type { IntegrationConnection as PrismaIntegrationConnection } from '@repo/database';

import { GitHubConnection } from '../../domain/github-connection.entity';

export const GITHUB_PROVIDER = 'GITHUB' as const;

export class PrismaGitHubConnectionMapper {
  static toDomain(raw: PrismaIntegrationConnection): GitHubConnection {
    return GitHubConnection.rehydrate({
      id: raw.id,
      ownerId: raw.ownerId,
      account: {
        id: raw.externalAccountId,
        // Luôn có với GitHub; cột nullable vì provider khác không có node id.
        nodeId: raw.externalAccountNodeId ?? '',
        login: raw.displayName,
      },
      encryptedToken: raw.credentials,
      // EXPIRED không được ghi — nó được suy ra từ expiresAt (statusAt).
      status: raw.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE',
      expiresAt: raw.expiresAt,
      lastVerifiedAt: raw.lastVerifiedAt,
      createdAt: raw.createdAt,
    });
  }
  /** Các cột được cập nhật khi lưu lại (không gồm id, owner, provider, createdAt). */
  static toMutableData(connection: GitHubConnection) {
    const snapshot = connection.toSnapshot();
    return {
      externalAccountId: snapshot.account.id,
      externalAccountNodeId: snapshot.account.nodeId,
      displayName: snapshot.account.login,
      credentials: snapshot.encryptedToken,
      status: snapshot.status,
      expiresAt: snapshot.expiresAt,
      lastVerifiedAt: snapshot.lastVerifiedAt,
    };
  }
}
