import { Inject, Injectable } from '@nestjs/common';

import {
  ACTIVITY_PROVIDER_PORTS,
  type ActivityProviderPort,
  ActivitySourceError,
} from '@shared/application/activity';

import type { ActivityFeed } from '../../domain/activity-feed.entity';
import {
  ACTIVITY_FEED_REPOSITORY,
  type ActivityFeedRepository,
} from '../../domain/ports/activity-feed.repository';
import {
  ACTIVITY_EVENT_WRITER,
  type ActivityEventWriter,
} from '../ports/activity-event-writer.port';
import { CLOCK, type Clock } from '../ports/clock.port';
import { providerFor } from './provider-for';

/**
 * Chép một feed theo yêu cầu (03 §5): hỏi nguồn khoảng còn thiếu, ghi vào
 * sổ, rồi mới nới mốc. Lỗi của nguồn được ghi lên feed, không ném ra.
 */
@Injectable()
export class ActivitySyncService {
  constructor(
    @Inject(ACTIVITY_FEED_REPOSITORY)
    private readonly feeds: ActivityFeedRepository,
    @Inject(ACTIVITY_EVENT_WRITER)
    private readonly writer: ActivityEventWriter,
    @Inject(ACTIVITY_PROVIDER_PORTS)
    private readonly providers: ActivityProviderPort[],
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  /**
   * Trả feed sau lần chép (hoặc nguyên trạng nếu còn mới); null nếu owner
   * không có feed này.
   */
  async syncFeed(input: {
    ownerId: string;
    feedId: string;
    /** Sổ cần phủ từ thời điểm này (lúc Cycle mở, lúc gắn nguồn). */
    neededFrom: Date;
  }): Promise<ActivityFeed | null> {
    const feed = await this.feeds.findById(input.ownerId, input.feedId);
    if (!feed) return null;

    const provider = providerFor(this.providers, feed.provider);
    // Lúc bắt đầu chép: lastSyncAt và thứ tự giữa các lần chép dựa vào nó.
    const now = this.clock.now();
    const plan = {
      neededFrom: input.neededFrom,
      now,
      historyWindowDays: provider.capabilities.historyWindowDays,
    };
    if (!feed.needsSyncAt(plan)) return feed;

    const window = feed.planSync(plan);
    try {
      const fetched = await provider.fetchEvents(
        {
          ownerId: feed.ownerId,
          externalAccountId: feed.externalAccountId,
          externalResourceId: feed.externalResourceId,
        },
        window.from,
        window.to,
      );
      // Sổ trước, mốc sau: lỗi giữa chừng không để lại mốc đã tiến mà sổ
      // thiếu event. Chép lại thì khóa chống trùng lo phần đã ghi.
      if (fetched.replacedWindows) {
        await this.writer.replace(
          feed.id,
          fetched.replacedWindows,
          fetched.events,
        );
      } else {
        await this.writer.append(feed.id, fetched.events);
      }

      feed.recordSuccess({ window, displayName: fetched.displayName, now });
    } catch (error) {
      if (!(error instanceof ActivitySourceError)) throw error;
      feed.recordFailure({ code: error.code, now });
    }

    await this.feeds.saveSyncResult(feed);
    return feed;
  }
}
