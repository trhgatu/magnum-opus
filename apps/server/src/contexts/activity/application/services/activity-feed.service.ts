import { Inject, Injectable } from '@nestjs/common';
import { CommandBus } from '@nestjs/cqrs';
import type { ActivityProvider } from '@repo/contracts';

import {
  ACTIVITY_PROVIDER_PORTS,
  type ActivityProviderPort,
} from '@shared/application/activity';
import type { DomainException } from '@shared/domain/exceptions/domain.exception';
import type { Result } from '@shared/domain/result';

import type { ActivityFeed } from '../../domain/activity-feed.entity';
import { EnsureActivityFeedCommand } from '../commands/ensure-activity-feed.command';
import { providerFor } from './provider-for';

/** Cho tầng trên lấy feed của một tài nguyên mà không biết nguồn là gì. */
@Injectable()
export class ActivityFeedService {
  constructor(
    @Inject(ACTIVITY_PROVIDER_PORTS)
    private readonly providers: ActivityProviderPort[],
    private readonly commandBus: CommandBus,
  ) {}

  /**
   * Id feed của tài nguyên dưới tài khoản đang kết nối; tạo nếu chưa có.
   * Ném ActivitySourceError khi kết nối không đọc được tài nguyên.
   */
  async ensureFeed(input: {
    ownerId: string;
    provider: ActivityProvider;
    externalResourceId: string;
  }): Promise<string> {
    const resolved = await providerFor(
      this.providers,
      input.provider,
    ).resolveResource(input.ownerId, input.externalResourceId);

    const result = await this.commandBus.execute<
      EnsureActivityFeedCommand,
      Result<ActivityFeed, DomainException>
    >(
      new EnsureActivityFeedCommand({
        ownerId: input.ownerId,
        provider: input.provider,
        externalAccountId: resolved.externalAccountId,
        externalResourceId: input.externalResourceId,
        displayName: resolved.displayName,
      }),
    );
    return result.unwrap().id;
  }

  /** Tài khoản đang kết nối của nguồn; null khi chưa kết nối. */
  connectedAccountId(input: {
    ownerId: string;
    provider: ActivityProvider;
  }): Promise<string | null> {
    return providerFor(this.providers, input.provider).connectedAccountId(
      input.ownerId,
    );
  }
}
