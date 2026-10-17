import type { ActivityProvider } from '@repo/contracts';
import type { ActivityFeed } from '../activity-feed.entity';

export const ACTIVITY_FEED_REPOSITORY = Symbol('ACTIVITY_FEED_REPOSITORY');

/** Một tài nguyên bên ngoài của một tài khoản — khóa tự nhiên của feed. */
export interface ActivityResourceKey {
  ownerId: string;
  provider: ActivityProvider;
  externalAccountId: string;
  externalResourceId: string;
}

export interface ActivityFeedRepository {
  /** Chỉ trong phạm vi owner: feed của người khác coi như không có. */
  findById(ownerId: string, feedId: string): Promise<ActivityFeed | null>;
  findByResource(key: ActivityResourceKey): Promise<ActivityFeed | null>;
  /**
   * Tạo feed. Trả false nếu tài nguyên này đã có feed — vd một request khác
   * vừa tạo xong — thay vì tạo trùng.
   */
  insert(feed: ActivityFeed): Promise<boolean>;
  /**
   * Lưu kết quả một lần chép, trong một transaction. Ở DB, syncedUntil chỉ
   * tiến và coveredFrom chỉ lùi (hoặc bắt đầu lại sau một lỗ hổng); trạng
   * thái chỉ ghi khi lần chép bắt đầu không sớm hơn lần đã lưu. Một lần chép
   * bắt đầu trước nhưng xong sau không làm hỏng kết quả mới hơn.
   */
  saveSyncResult(feed: ActivityFeed): Promise<void>;
}
