import type {
  ActivityProvider,
  ActivitySourceErrorCode,
  ActivitySourceStatus,
} from '@repo/contracts';

import type { ActivityKind } from '@shared/application/activity';

export const ACTIVITY_LEDGER_READER = Symbol('ACTIVITY_LEDGER_READER');

export interface LedgerEvent {
  feedId: string;
  kind: ActivityKind;
  occurredAt: Date;
  quantity: number;
}

/** Phần sổ một feed có được — đoạn ngoài [coveredFrom, syncedUntil) là "không có dữ liệu". */
export interface LedgerFeed {
  feedId: string;
  provider: ActivityProvider;
  /** Tài khoản bên ngoài mà feed được chép dưới nó. */
  externalAccountId: string;
  externalResourceId: string;
  displayName: string;
  status: ActivitySourceStatus;
  lastErrorCode: ActivitySourceErrorCode | null;
  coveredFrom: Date | null;
  syncedUntil: Date | null;
  lastSyncAt: Date | null;
}

/** Cho tầng trên (project-activity) đọc sổ — không bao giờ ghi. */
export interface ActivityLedgerReader {
  /** Event của các feed thuộc owner, trong [from, to), occurredAt tăng dần. */
  listEvents(input: {
    ownerId: string;
    feedIds: string[];
    from: Date;
    to: Date;
  }): Promise<LedgerEvent[]>;

  /** Feed thuộc owner trong danh sách; feed của người khác bị bỏ qua. */
  listFeeds(input: {
    ownerId: string;
    feedIds: string[];
  }): Promise<LedgerFeed[]>;
}
