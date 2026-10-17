import type {
  ActivityProvider,
  ActivitySourceErrorCode,
  ActivitySourceStatus,
} from '@repo/contracts';

/** Chép lại khi lần chép trước đã cũ hơn chừng này (03 §5.1). */
const FRESHNESS_MS = 10 * 60_000;

/** Lùi lại sau lần chép trước để bắt commit push muộn (03 §5.2). */
const SYNC_BUFFER_MS = 2 * 86_400_000;

/** Lần chép đầu lùi rộng hơn trước mốc cần (02 §6.14). */
const FIRST_SYNC_BUFFER_MS = 7 * 86_400_000;
const DAY_MS = 86_400_000;

export type ActivityFeedStatus = ActivitySourceStatus;

export interface SyncWindow {
  from: Date;
  to: Date;
}

export interface ActivityFeedSnapshot {
  id: string;
  ownerId: string;
  provider: ActivityProvider;
  externalAccountId: string;
  externalResourceId: string;
  displayName: string;
  /** Sổ đầy đủ từ thời điểm này; null khi chưa chép lần nào. */
  coveredFrom: Date | null;
  /** Sổ đầy đủ tới thời điểm này; null khi chưa chép lần nào. */
  syncedUntil: Date | null;
  lastSyncAt: Date | null;
  status: ActivityFeedStatus;
  lastErrorCode: ActivitySourceErrorCode | null;
  createdAt: Date;
}

/** Lỗi khiến feed không còn chép được cho tới khi người dùng kết nối lại. */
const DISCONNECTING_ERRORS: ReadonlySet<ActivitySourceErrorCode> = new Set([
  'GITHUB_NOT_CONNECTED',
  'GITHUB_TOKEN_EXPIRED',
  'GITHUB_TOKEN_REVOKED',
  'GITHUB_ACCOUNT_CHANGED',
]);

/** Lỗi tạm thời: feed vẫn ACTIVE, dùng sổ hiện có và thử lại lần sau. */
const TRANSIENT_ERRORS: ReadonlySet<ActivitySourceErrorCode> = new Set([
  'GITHUB_RATE_LIMITED',
  'GITHUB_UNAVAILABLE',
]);

/**
 * Một tài nguyên bên ngoài (repository...) và phần sổ đã chép được của nó.
 * Một feed cho mỗi tài nguyên của mỗi tài khoản, dù bao nhiêu Project dùng.
 */
export class ActivityFeed {
  private constructor(private props: ActivityFeedSnapshot) {}

  static create(input: {
    id: string;
    ownerId: string;
    provider: ActivityProvider;
    externalAccountId: string;
    externalResourceId: string;
    displayName: string;
    now: Date;
  }): ActivityFeed {
    return new ActivityFeed({
      id: input.id,
      ownerId: input.ownerId,
      provider: input.provider,
      externalAccountId: input.externalAccountId,
      externalResourceId: input.externalResourceId,
      displayName: input.displayName,
      coveredFrom: null,
      syncedUntil: null,
      lastSyncAt: null,
      status: 'ACTIVE',
      lastErrorCode: null,
      createdAt: new Date(input.now),
    });
  }

  static rehydrate(snapshot: ActivityFeedSnapshot): ActivityFeed {
    return new ActivityFeed(copySnapshot(snapshot));
  }

  get id(): string {
    return this.props.id;
  }

  get ownerId(): string {
    return this.props.ownerId;
  }

  get provider(): ActivityProvider {
    return this.props.provider;
  }

  get externalAccountId(): string {
    return this.props.externalAccountId;
  }

  get externalResourceId(): string {
    return this.props.externalResourceId;
  }

  get displayName(): string {
    return this.props.displayName;
  }

  get coveredFrom(): Date | null {
    return cloneDate(this.props.coveredFrom);
  }

  get syncedUntil(): Date | null {
    return cloneDate(this.props.syncedUntil);
  }

  get lastSyncAt(): Date | null {
    return cloneDate(this.props.lastSyncAt);
  }

  get status(): ActivityFeedStatus {
    return this.props.status;
  }

  get lastErrorCode(): ActivitySourceErrorCode | null {
    return this.props.lastErrorCode;
  }

  /** Cần chép lại: chưa chép lần nào, hoặc lần trước đã quá 10 phút. */
  isStaleAt(now: Date): boolean {
    const { lastSyncAt } = this.props;
    return (
      lastSyncAt === null ||
      now.getTime() - lastSyncAt.getTime() >= FRESHNESS_MS
    );
  }

  /**
   * Khoảng cần hỏi nguồn để sổ phủ từ neededFrom tới now: tiếp nối lần chép
   * trước (lùi một khoảng đệm), và lùi xa hơn nếu Project cần lịch sử feed
   * chưa có.
   */
  planSync(input: {
    neededFrom: Date;
    now: Date;
    historyWindowDays: number | null;
  }): SyncWindow {
    const { coveredFrom, syncedUntil } = this.props;
    const reachable = (time: number) =>
      input.historyWindowDays === null
        ? time
        : Math.max(
            time,
            input.now.getTime() - input.historyWindowDays * DAY_MS,
          );

    if (coveredFrom === null || syncedUntil === null) {
      return {
        from: new Date(
          reachable(input.neededFrom.getTime() - FIRST_SYNC_BUFFER_MS),
        ),
        to: new Date(input.now),
      };
    }

    let from = syncedUntil.getTime() - SYNC_BUFFER_MS;
    const needed = reachable(input.neededFrom.getTime());
    if (needed < coveredFrom.getTime()) from = Math.min(from, needed);

    // Nguồn giới hạn lịch sử: lần chép trễ cũng không hỏi xa hơn nguồn giữ.
    return { from: new Date(reachable(from)), to: new Date(input.now) };
  }
  /**
   * Lần chép thành công: sổ chỉ nở ra, không bao giờ co lại — trừ khi lần
   * chép không nối được với phần đã có (nguồn giới hạn lịch sử, chép quá
   * trễ): khi đó độ phủ bắt đầu lại từ lần chép này, không ghi đè lỗ hổng.
   * `now` là lúc lần chép bắt đầu.
   */
  recordSuccess(input: {
    window: SyncWindow;
    displayName: string;
    now: Date;
  }): void {
    const { coveredFrom, syncedUntil } = this.props;
    const leavesGap = syncedUntil !== null && input.window.from > syncedUntil;
    this.props.coveredFrom = new Date(
      coveredFrom === null || leavesGap
        ? input.window.from
        : Math.min(coveredFrom.getTime(), input.window.from.getTime()),
    );
    this.props.syncedUntil = new Date(
      syncedUntil === null
        ? input.window.to
        : Math.max(syncedUntil.getTime(), input.window.to.getTime()),
    );
    this.props.displayName = input.displayName;
    this.props.lastSyncAt = new Date(input.now);
    this.props.status = 'ACTIVE';
    this.props.lastErrorCode = null;
  }

  /**
   * Lần chép thất bại: giữ nguyên sổ, ghi lỗi để giao diện hướng dẫn.
   * `now` là lúc lần chép bắt đầu.
   */
  recordFailure(input: { code: ActivitySourceErrorCode; now: Date }): void {
    this.props.status = DISCONNECTING_ERRORS.has(input.code)
      ? 'DISCONNECTED'
      : TRANSIENT_ERRORS.has(input.code)
        ? 'ACTIVE'
        : 'ERROR';
    this.props.lastErrorCode = input.code;
    this.props.lastSyncAt = new Date(input.now);
  }

  toSnapshot(): ActivityFeedSnapshot {
    return copySnapshot(this.props);
  }
}

const cloneDate = (date: Date | null): Date | null =>
  date ? new Date(date) : null;

/** Bản sao sâu: Date là mutable, không được chia sẻ với bên ngoài entity. */
const copySnapshot = (
  snapshot: ActivityFeedSnapshot,
): ActivityFeedSnapshot => ({
  ...snapshot,
  coveredFrom: cloneDate(snapshot.coveredFrom),
  syncedUntil: cloneDate(snapshot.syncedUntil),
  lastSyncAt: cloneDate(snapshot.lastSyncAt),
  createdAt: new Date(snapshot.createdAt),
});
