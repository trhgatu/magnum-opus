import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type { ActivityFeed } from '../../domain/activity-feed.entity';
import type {
  ActivityFeedRepository,
  ActivityResourceKey,
} from '../../domain/ports/activity-feed.repository';
import { PrismaActivityFeedMapper } from '../mappers/prisma-activity-feed.mapper';

@Injectable()
export class PrismaActivityFeedRepository implements ActivityFeedRepository {
  constructor(private readonly prisma: PrismaService) {}

  async findById(
    ownerId: string,
    feedId: string,
  ): Promise<ActivityFeed | null> {
    const raw = await this.prisma.activityFeed.findFirst({
      where: { id: feedId, ownerId },
    });
    return raw ? PrismaActivityFeedMapper.toDomain(raw) : null;
  }

  async findByResource(key: ActivityResourceKey): Promise<ActivityFeed | null> {
    const raw = await this.prisma.activityFeed.findUnique({
      where: { ownerId_provider_externalAccountId_externalResourceId: key },
    });
    return raw ? PrismaActivityFeedMapper.toDomain(raw) : null;
  }

  async insert(feed: ActivityFeed): Promise<boolean> {
    try {
      await this.prisma.activityFeed.create({ data: feed.toSnapshot() });
      return true;
    } catch (error) {
      // Unique (owner, provider, account, resource): request khác tạo trước.
      if (isUniqueConflict(error)) return false;
      throw error;
    }
  }

  async saveSyncResult(feed: ActivityFeed): Promise<void> {
    const snapshot = feed.toSnapshot();
    const scope = { id: snapshot.id, ownerId: snapshot.ownerId };

    const operations = [
      this.prisma.activityFeed.updateMany({
        where: scope,
        data: {
          displayName: snapshot.displayName,
          status: snapshot.status,
          lastErrorCode: snapshot.lastErrorCode,
          lastSyncAt: snapshot.lastSyncAt,
        },
      }),
    ];
    // Có điều kiện (03 §5.4): hai lần chép song song, lần xong sau nhưng
    // bắt đầu trước không kéo mốc ngược lại.
    if (snapshot.syncedUntil) {
      operations.push(
        this.prisma.activityFeed.updateMany({
          where: {
            ...scope,
            OR: [
              { syncedUntil: null },
              { syncedUntil: { lt: snapshot.syncedUntil } },
            ],
          },
          data: { syncedUntil: snapshot.syncedUntil },
        }),
      );
    }
    if (snapshot.coveredFrom) {
      operations.push(
        this.prisma.activityFeed.updateMany({
          where: {
            ...scope,
            OR: [
              { coveredFrom: null },
              { coveredFrom: { gt: snapshot.coveredFrom } },
            ],
          },
          data: { coveredFrom: snapshot.coveredFrom },
        }),
      );
    }

    await this.prisma.$transaction(operations);
  }
}

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
