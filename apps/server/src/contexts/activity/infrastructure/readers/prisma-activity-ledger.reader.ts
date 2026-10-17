import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  ActivityLedgerReader,
  LedgerEvent,
  LedgerFeed,
} from '../../application/ports/activity-ledger-reader.port';
import { PrismaActivityFeedMapper } from '../mappers/prisma-activity-feed.mapper';

@Injectable()
export class PrismaActivityLedgerReader implements ActivityLedgerReader {
  constructor(private readonly prisma: PrismaService) {}

  async listEvents(input: {
    ownerId: string;
    feedIds: string[];
    from: Date;
    to: Date;
  }): Promise<LedgerEvent[]> {
    if (input.feedIds.length === 0) return [];

    return this.prisma.activityEvent.findMany({
      where: {
        feedId: { in: input.feedIds },
        // Owner qua feed: id feed của người khác không đọc được gì.
        feed: { ownerId: input.ownerId },
        occurredAt: { gte: input.from, lt: input.to },
      },
      select: { feedId: true, kind: true, occurredAt: true, quantity: true },
      orderBy: { occurredAt: 'asc' },
    });
  }

  async listFeeds(input: {
    ownerId: string;
    feedIds: string[];
  }): Promise<LedgerFeed[]> {
    if (input.feedIds.length === 0) return [];

    const rows = await this.prisma.activityFeed.findMany({
      where: { id: { in: input.feedIds }, ownerId: input.ownerId },
    });
    return rows.map((row) => {
      const feed = PrismaActivityFeedMapper.toDomain(row);
      return {
        feedId: feed.id,
        provider: feed.provider,
        externalAccountId: feed.externalAccountId,
        externalResourceId: feed.externalResourceId,
        displayName: feed.displayName,
        status: feed.status,
        lastErrorCode: feed.lastErrorCode,
        coveredFrom: feed.coveredFrom,
        syncedUntil: feed.syncedUntil,
        lastSyncAt: feed.lastSyncAt,
      };
    });
  }
}
