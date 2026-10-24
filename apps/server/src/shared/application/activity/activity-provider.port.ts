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
/** Tài nguyên mà người dùng muốn gắn, như kết nối hiện tại nhìn thấy. */
export interface ResolvedResource {
  /** Tài khoản bên ngoài đang kết nối — feed được tạo dưới tài khoản này. */
  externalAccountId: string;
  displayName: string;
}

export interface TimeWindow {
  from: Date;
  to: Date;
}
export interface FetchedActivity {
  /** Tên hiện tại của tài nguyên — đổi tên thì feed cập nhật theo. */
  displayName: string;
  events: ActivityEventInput[];
  /**
   * Chỉ provider "thay theo ngày" (WakaTime): mỗi khoảng là một ngày nguồn
   * đã đọc TRỌN. Sổ xóa CODING_TIME của feed trong từng khoảng rồi ghi lại
   * events thuộc khoảng đó; khoảng không có ở đây thì không bị đụng tới.
   * `[]` nghĩa là không ngày nào đọc trọn: sổ giữ nguyên, không ghi gì.
   */
  replacedWindows?: TimeWindow[];
}

export interface ActivityProviderPort {
  readonly provider: ActivityProvider;
  readonly capabilities: {
    /** null: đọc lại lịch sử bao xa cũng được (GitHub). */
    historyWindowDays: number | null;
  };

  /**
   * Sự kiện tới nguồn trong [from, to), đã lọc (chỉ của người dùng, bỏ bot,
   * bỏ merge commit) và đã tính khóa chống trùng. occurredAt có thể sớm hơn
   * from (vd commit viết trước, push sau) — sổ chống trùng bằng khóa. Ném ActivitySourceError khi không
   * đọc được nguồn.
   */
  fetchEvents(
    resource: ActivityResourceRef,
    from: Date,
    to: Date,
  ): Promise<FetchedActivity>;

  /**
   * Kết nối hiện tại có đọc được tài nguyên không, dưới tài khoản nào, tên
   * hiện tại là gì — trước khi gắn nó vào một Project. Ném ActivitySourceError.
   */
  resolveResource(
    ownerId: string,
    externalResourceId: string,
  ): Promise<ResolvedResource>;

  /**
   * Tài khoản bên ngoài của kết nối đang lưu — kể cả khi token đã hết hạn
   * hay bị thu hồi, nên khác null không có nghĩa là kết nối còn dùng được.
   * null khi chưa kết nối. Không gọi nguồn bên ngoài.
   */
  connectedAccountId(ownerId: string): Promise<string | null>;
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
