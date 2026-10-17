import type {
  ActivityProvider,
  ActivitySourceErrorCode,
} from '@repo/contracts';

import type { ActivityKind } from './activity-types';

/** Multi-provider: mỗi integration đăng ký một ActivityProviderPort. */
export const ACTIVITY_PROVIDER_PORTS = Symbol('ACTIVITY_PROVIDER_PORTS');

export interface ActivityResourceRef {
  ownerId: string;
  /** Tài khoản bên ngoài mà feed thuộc về. Khác tài khoản đang kết nối → GITHUB_ACCOUNT_CHANGED. */
  externalAccountId: string;
  externalResourceId: string;
}

export interface ActivityEventInput {
  kind: ActivityKind;
  occurredAt: Date;
  /** 1, hoặc số giây với CODING_TIME (sau này). */
  quantity: number;
  dedupeKey: string;
}
export interface FetchedActivity {
  /** Tên hiện tại của tài nguyên — đổi tên thì feed cập nhật theo. */
  displayName: string;
  events: ActivityEventInput[];
}

export interface ActivityProviderPort {
  readonly provider: ActivityProvider;
  readonly capabilities: {
    /** null: đọc lại lịch sử bao xa cũng được (GitHub). */
    historyWindowDays: number | null;
  };

  /**
   * Sự kiện trong [from, to), đã lọc (chỉ của người dùng, bỏ bot, bỏ merge
   * commit) và đã tính khóa chống trùng. Ném ActivitySourceError khi không
   * đọc được nguồn.
   */
  fetchEvents(
    resource: ActivityResourceRef,
    from: Date,
    to: Date,
  ): Promise<FetchedActivity>;
}
/** Lỗi của nguồn, mang mã mà feed lưu vào lastErrorCode. */
export class ActivitySourceError extends Error {
  constructor(
    readonly code: ActivitySourceErrorCode,
    readonly retryAfterSeconds: number | null = null,
  ) {
    super(`Activity source failed: ${code}`);
    this.name = 'ActivitySourceError';
  }
}
