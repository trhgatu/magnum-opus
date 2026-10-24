export const WAKATIME_CONNECTION_STATUSES = ['ACTIVE', 'REVOKED'] as const;

export type WakaTimeConnectionStatus =
  (typeof WAKATIME_CONNECTION_STATUSES)[number];

/** Không bao giờ có API key, kể cả dạng đã mã hóa (BA 08 §9.1). */
export interface WakaTimeConnectionResponse {
  account: { id: string; username: string };
  /** API key WakaTime không hết hạn: chỉ có ACTIVE hoặc REVOKED. */
  status: WakaTimeConnectionStatus;
  lastVerifiedAt: string;
  connectedAt: string;
}
