import {
  ACTIVITY_SOURCE_ERROR_CODES,
  type ActivitySourceErrorCode,
} from '@repo/contracts';
import type { ActivityFeed as PrismaActivityFeed } from '@repo/database';

import { ActivityFeed } from '../../domain/activity-feed.entity';

export class PrismaActivityFeedMapper {
  static toDomain(raw: PrismaActivityFeed): ActivityFeed {
    return ActivityFeed.rehydrate({
      id: raw.id,
      ownerId: raw.ownerId,
      provider: raw.provider,
      externalAccountId: raw.externalAccountId,
      externalResourceId: raw.externalResourceId,
      displayName: raw.displayName,
      coveredFrom: raw.coveredFrom,
      syncedUntil: raw.syncedUntil,
      lastSyncAt: raw.lastSyncAt,
      status: raw.status,
      lastErrorCode: toErrorCode(raw.lastErrorCode),
      createdAt: raw.createdAt,
    });
  }
}

/** Cột là chuỗi tự do: mã không còn trong danh sách thì bỏ, không tin mù. */

function toErrorCode(value: string | null): ActivitySourceErrorCode | null {
  return (ACTIVITY_SOURCE_ERROR_CODES as readonly string[]).includes(
    value ?? '',
  )
    ? (value as ActivitySourceErrorCode)
    : null;
}
