import { Inject, Logger } from '@nestjs/common';
import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';

import {
  ACTIVITY_LEDGER_READER,
  type ActivityLedgerReader,
} from '@activity/application/ports/activity-ledger-reader.port';
import { ActivitySyncService } from '@activity/application/services/activity-sync.service';
import { DomainException } from '@shared/domain/exceptions/domain.exception';
import { Result } from '@shared/domain/result';

import type { LinkedSource } from '../../../domain/activity-evidence';
import { DeclarationTimeline } from '../../../domain/declaration-timeline';
import { ProjectNotFoundException } from '../../../domain/exceptions';
import {
  PROJECT_ACTIVITY_SOURCE_REPOSITORY,
  type ProjectActivitySourceRepository,
} from '../../../domain/ports/project-activity-source.repository';
import { detectDivergences } from '../../../domain/services/detect-divergences';
import { neededFrom } from '../../../domain/services/needed-from';
import { summarizeCycleActivity } from '../../../domain/services/summarize-cycle-activity';
import {
  ACCOUNT_TIME_ZONE_READER,
  type AccountTimeZoneReader,
} from '../../ports/account-time-zone-reader.port';
import { CLOCK, type Clock } from '../../ports/clock.port';
import {
  PROJECT_DECLARATION_READER,
  type ProjectDeclarationReader,
} from '../../ports/project-declaration-reader.port';
import {
  type CycleActivityView,
  type ProjectActivityView,
  toSourceViews,
} from '../../views';
import { SYNC_TIME_LIMIT_MS, withinTimeLimit } from '../../within-time-limit';
import { GetProjectActivityQuery } from '..';

/**
 * Hoạt động của Project (07 §5.4): chép các nguồn đã cũ trong giới hạn thời
 * gian, rồi đặt sổ cạnh lời tuyên bố. Lỗi của nguồn không bao giờ làm request
 * thất bại — chúng nằm trên từng nguồn.
 */
@QueryHandler(GetProjectActivityQuery)
export class GetProjectActivityHandler implements IQueryHandler<
  GetProjectActivityQuery,
  Result<ProjectActivityView, DomainException>
> {
  private readonly logger = new Logger(GetProjectActivityHandler.name);

  constructor(
    @Inject(PROJECT_DECLARATION_READER)
    private readonly declarations: ProjectDeclarationReader,
    @Inject(PROJECT_ACTIVITY_SOURCE_REPOSITORY)
    private readonly sources: ProjectActivitySourceRepository,
    private readonly sync: ActivitySyncService,
    @Inject(ACTIVITY_LEDGER_READER)
    private readonly ledger: ActivityLedgerReader,
    @Inject(ACCOUNT_TIME_ZONE_READER)
    private readonly timeZones: AccountTimeZoneReader,
    @Inject(CLOCK) private readonly clock: Clock,
  ) {}

  async execute({
    ownerId,
    projectId,
  }: GetProjectActivityQuery): Promise<
    Result<ProjectActivityView, DomainException>
  > {
    const declaration = await this.declarations.read(ownerId, projectId);
    if (!declaration) {
      return Result.fail(new ProjectNotFoundException(projectId));
    }

    const timeZone = await this.timeZones.getForUser(ownerId);
    const links = await this.sources.listByProject(ownerId, projectId);
    // Không có nguồn: không chép, không đọc sổ (07 §5.4 bước 1).
    if (links.length === 0) {
      return Result.ok({
        projectId,
        timeZone,
        sources: [],
        currentCycle: null,
        divergences: [],
      });
    }

    const timeline = DeclarationTimeline.fromTransitions(
      declaration.transitions,
    );
    const needed = links.map((link) => ({
      feedId: link.feedId,
      from: neededFrom(timeline, link.linkedAt),
    }));

    // Các nguồn chép song song, chung một giới hạn thời gian; quá giờ thì
    // dùng sổ đang có. Nguồn còn mới không bị gọi (ActivitySyncService).
    await withinTimeLimit(
      Promise.allSettled(
        needed.map(({ feedId, from }) =>
          this.sync.syncFeed({ ownerId, feedId, neededFrom: from }),
        ),
      ).then((results) =>
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            this.logger.warn(
              `Copying feed ${needed[index].feedId} failed: ${String(result.reason)}`,
            );
          }
        }),
      ),
      SYNC_TIME_LIMIT_MS,
    );

    const now = this.clock.now();
    const feedIds = links.map((link) => link.feedId);
    const feeds = await this.ledger.listFeeds({ ownerId, feedIds });
    const sources = toSourceViews(links, feeds);
    const events = await this.ledger.listEvents({
      ownerId,
      feedIds,
      from: new Date(Math.min(...needed.map(({ from }) => from.getTime()))),
      to: now,
    });

    const linkedSources: LinkedSource[] = sources.map((source) => ({
      feedId: source.feedId,
      linkedAt: source.linkedAt,
      status: source.status,
      coveredFrom: source.coveredFrom,
      syncedUntil: source.syncedUntil,
    }));

    let currentCycle: CycleActivityView | null = null;
    const cycleId = timeline.currentCycleId;
    const cycle = declaration.cycles.find(
      (candidate) => candidate.id === cycleId,
    );
    if (cycleId && cycle) {
      currentCycle = {
        cycleId,
        cycleNumber: cycle.cycleNumber,
        startedAt: cycle.startedAt,
        ...summarizeCycleActivity({
          cycleId,
          timeline,
          events,
          sources: linkedSources,
          timeZone,
          until: now,
        }),
      };
    }

    return Result.ok({
      projectId,
      timeZone,
      sources,
      currentCycle,
      divergences: detectDivergences({
        timeline,
        events,
        sources: linkedSources,
        timeZone,
        now,
      }),
    });
  }
}
