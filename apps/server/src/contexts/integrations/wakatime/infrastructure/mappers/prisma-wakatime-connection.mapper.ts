import type { IntegrationConnection as PrismaIntegrationConnection } from '@repo/database';

import { WakaTimeConnection } from '../../domain/wakatime-connection.entity';

export const WAKATIME_PROVIDER = 'WAKATIME' as const;

export class PrismaWakaTimeConnectionMapper {
  static toDomain(raw: PrismaIntegrationConnection): WakaTimeConnection {
    return WakaTimeConnection.rehydrate({
      id: raw.id,
      ownerId: raw.ownerId,
      account: { id: raw.externalAccountId, username: raw.displayName },
      encryptedKey: raw.credentials,
      // Key WakaTime không hết hạn: chỉ REVOKED hoặc ACTIVE.
      status: raw.status === 'REVOKED' ? 'REVOKED' : 'ACTIVE',
      lastVerifiedAt: raw.lastVerifiedAt,
      createdAt: raw.createdAt,
    });
  }

  /** Các cột được cập nhật khi lưu lại (không gồm id, owner, provider, createdAt). */
  static toMutableData(connection: WakaTimeConnection) {
    const snapshot = connection.toSnapshot();
    return {
      externalAccountId: snapshot.account.id,
      // WakaTime không có node id như GitHub.
      externalAccountNodeId: null,
      displayName: snapshot.account.username,
      credentials: snapshot.encryptedKey,
      status: snapshot.status,
      expiresAt: null,
      lastVerifiedAt: snapshot.lastVerifiedAt,
    };
  }
}
