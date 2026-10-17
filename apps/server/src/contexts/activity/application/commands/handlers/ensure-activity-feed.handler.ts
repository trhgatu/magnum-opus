import { Inject } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import { randomUUID } from 'node:crypto';

import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { ActivityFeed } from '../../../domain/activity-feed.entity';
import {
  ACTIVITY_FEED_REPOSITORY,
  type ActivityFeedRepository,
} from '../../../domain/ports/activity-feed.repository';
import { CLOCK, type Clock } from '../../ports/clock.port';
import { EnsureActivityFeedCommand } from '../ensure-activity-feed.command';

/**
 * Feed của một tài nguyên: dùng lại nếu đã có (một feed cho mọi Project gắn
 * tài nguyên đó), tạo mới nếu chưa.
 */
@CommandHandler(EnsureActivityFeedCommand)
export class EnsureActivityFeedHandler implements ICommandHandler<
  EnsureActivityFeedCommand,
  Result<ActivityFeed, DomainException>
> {
  constructor(
    @Inject(ACTIVITY_FEED_REPOSITORY)
    private readonly feeds: ActivityFeedRepository,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({
    ownerId,
    provider,
    externalAccountId,
    externalResourceId,
    displayName,
  }: EnsureActivityFeedCommand): Promise<
    Result<ActivityFeed, DomainException>
  > {
    const key = { ownerId, provider, externalAccountId, externalResourceId };

    const existing = await this.feeds.findByResource(key);
    if (existing) return Result.ok(existing);

    const feed = ActivityFeed.create({
      id: randomUUID(),
      ...key,
      displayName,
      now: this.clock.now(),
    });
    if (await this.feeds.insert(feed)) return Result.ok(feed);

    // Thua race: một request khác vừa tạo feed cho cùng tài nguyên.
    const winner = await this.feeds.findByResource(key);
    if (!winner) {
      // Feed không bao giờ bị xóa riêng lẻ; chỉ mất khi owner bị xóa.
      throw new Error('Activity feed disappeared right after it was created');
    }
    return Result.ok(winner);
  }
}
