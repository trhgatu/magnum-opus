import { Inject, Logger } from '@nestjs/common';
import { CommandHandler, ICommandHandler } from '@nestjs/cqrs';
import {
  type ActivitySourceErrorCode,
  type ErrorDefinition,
  Errors,
} from '@repo/contracts';

import {
  ACTIVITY_LEDGER_READER,
  type ActivityLedgerReader,
} from '@activity/application/ports/activity-ledger-reader.port';
import { ActivityFeedService } from '@activity/application/services/activity-feed.service';
import { ActivitySyncService } from '@activity/application/services/activity-sync.service';
import { ActivitySourceError } from '@shared/application/activity';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import { DeclarationTimeline } from '../../../domain/declaration-timeline';
import {
  ActivitySourceUnavailableException,
  ProjectNotFoundException,
} from '../../../domain/exceptions';
import {
  PROJECT_ACTIVITY_SOURCE_REPOSITORY,
  type ProjectActivitySourceRepository,
} from '../../../domain/ports/project-activity-source.repository';
import { neededFrom } from '../../../domain/services/needed-from';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  PROJECT_DECLARATION_READER,
  type ProjectDeclarationReader,
} from '../../ports/project-declaration-reader.port';
import { type ActivitySourceView, toSourceViews } from '../../views';
import { SYNC_TIME_LIMIT_MS, withinTimeLimit } from '../../within-time-limit';
import { LinkActivitySourceCommand } from '..';

export interface LinkedActivitySource {
  source: ActivitySourceView;
  /** false: tài nguyên đã là nguồn của Project — không tạo gì thêm. */
  created: boolean;
}

/**
 * Gắn một tài nguyên làm nguồn của Project (07 §5.2): lấy hoặc tạo feed,
 * tạo mối nối, rồi chép bù trong giới hạn thời gian. Chép thất bại không
 * làm thất bại việc gắn — lỗi nằm trên nguồn.
 */
@CommandHandler(LinkActivitySourceCommand)
export class LinkActivitySourceHandler implements ICommandHandler<
  LinkActivitySourceCommand,
  Result<LinkedActivitySource, DomainException>
> {
  private readonly logger = new Logger(LinkActivitySourceHandler.name);

  constructor(
    @Inject(PROJECT_DECLARATION_READER)
    private readonly declarations: ProjectDeclarationReader,
    @Inject(PROJECT_ACTIVITY_SOURCE_REPOSITORY)
    private readonly sources: ProjectActivitySourceRepository,
    private readonly feeds: ActivityFeedService,
    private readonly sync: ActivitySyncService,
    @Inject(ACTIVITY_LEDGER_READER)
    private readonly ledger: ActivityLedgerReader,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({
    ownerId,
    projectId,
    provider,
    externalResourceId,
  }: LinkActivitySourceCommand): Promise<
    Result<LinkedActivitySource, DomainException>
  > {
    const declaration = await this.declarations.read(ownerId, projectId);
    if (!declaration) {
      return Result.fail(new ProjectNotFoundException(projectId));
    }

    // Đã là nguồn (vd retry sau lỗi mạng): trả 200 ngay, không hỏi nguồn —
    // token hỏng hay bị giới hạn không được biến một retry thành lỗi.
    const existing = await this.existingSource(
      ownerId,
      projectId,
      provider,
      externalResourceId,
    );
    if (existing) return Result.ok({ source: existing, created: false });

    let feedId: string;
    try {
      feedId = await this.feeds.ensureFeed({
        ownerId,
        provider,
        externalResourceId,
      });
    } catch (error) {
      if (error instanceof ActivitySourceError) {
        return Result.fail(unavailable(error));
      }
      throw error;
    }

    // Hai request gắn cùng lúc: request thua nhận mối nối của request thắng.
    const { link, created } = await this.sources.link({
      projectId,
      feedId,
      ownerId,
      linkedAt: this.clock.now(),
    });

    if (created) {
      const timeline = DeclarationTimeline.fromTransitions(
        declaration.transitions,
      );
      await withinTimeLimit(
        this.sync
          .syncFeed({
            ownerId,
            feedId,
            neededFrom: neededFrom(timeline, link.linkedAt),
          })
          .catch((error: unknown) =>
            this.logger.warn(
              `Initial copy of feed ${feedId} failed: ${String(error)}`,
            ),
          ),
        SYNC_TIME_LIMIT_MS,
      );
    }

    const feeds = await this.ledger.listFeeds({ ownerId, feedIds: [feedId] });
    const [source] = toSourceViews([link], feeds);
    if (!source) throw new Error(`Activity feed ${feedId} is not readable`);
    return Result.ok({ source, created });
  }

  private async existingSource(
    ownerId: string,
    projectId: string,
    provider: LinkActivitySourceCommand['provider'],
    externalResourceId: string,
  ): Promise<ActivitySourceView | null> {
    const links = await this.sources.listByProject(ownerId, projectId);
    if (links.length === 0) return null;

    const feeds = await this.ledger.listFeeds({
      ownerId,
      feedIds: links.map((link) => link.feedId),
    });
    return (
      toSourceViews(links, feeds).find(
        (source) =>
          source.provider === provider &&
          source.externalResourceId === externalResourceId,
      ) ?? null
    );
  }
}

/** Lỗi của nguồn lúc gắn → mã API (07 §5.2). */
function unavailable(
  error: ActivitySourceError,
): ActivitySourceUnavailableException {
  const definitions: Partial<Record<ActivitySourceErrorCode, ErrorDefinition>> =
    {
      GITHUB_REPOSITORY_NOT_ACCESSIBLE: Errors.GITHUB_REPOSITORY_NOT_ACCESSIBLE,
      GITHUB_RATE_LIMITED: Errors.GITHUB_RATE_LIMITED,
      GITHUB_UNAVAILABLE: Errors.GITHUB_UNAVAILABLE,
    };
  // Chưa kết nối, token hết hạn hoặc bị thu hồi: đều là "chưa kết nối được".
  const definition = definitions[error.code] ?? Errors.GITHUB_NOT_CONNECTED;
  return new ActivitySourceUnavailableException(
    definition,
    error.retryAfterSeconds === null
      ? undefined
      : { retryAfter: error.retryAfterSeconds },
  );
}
