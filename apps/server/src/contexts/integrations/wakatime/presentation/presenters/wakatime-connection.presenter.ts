import type { WakaTimeConnectionResponse } from '@repo/contracts';

import type { WakaTimeConnection } from '../../domain/wakatime-connection.entity';

export class WakaTimeConnectionPresenter {
  /** Không bao giờ có API key, kể cả dạng đã mã hóa. */
  static toResponse(
    connection: WakaTimeConnection,
  ): WakaTimeConnectionResponse {
    return {
      account: { ...connection.account },
      status: connection.status,
      lastVerifiedAt: connection.lastVerifiedAt.toISOString(),
      connectedAt: connection.createdAt.toISOString(),
    };
  }
}
