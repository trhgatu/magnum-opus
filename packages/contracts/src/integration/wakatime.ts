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

/** Một WakaTime project để chọn làm nguồn (BA 08 §9.1). */
export interface WakaTimeProjectResponse {
  /** id ổn định của WakaTime — dùng làm externalResourceId khi gắn. */
  id: string;
  name: string;
  /** Lần cuối WakaTime nhận dữ liệu của project; null nếu chưa có. */
  lastHeartbeatAt: string | null;
  /** Project của Magnum Opus đang dùng project này làm nguồn. */
  usedByProjects: { id: string; title: string }[];
}
