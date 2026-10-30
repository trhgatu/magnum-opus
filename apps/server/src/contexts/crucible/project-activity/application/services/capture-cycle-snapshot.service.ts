import { Inject, Injectable, Logger } from '@nestjs/common';

import {
  ACTIVITY_LEDGER_READER,
  type ActivityLedgerReader,
} from '@activity/application/ports/activity-ledger-reader.port';
import { ActivitySyncService } from '@activity/application/services/activity-sync.service';

import { CODING_LOOKBACK_MS } from '../../domain/coding-time';
import type { LinkedSource } from '../../domain/activity-evidence';
import { DeclarationTimeline } from '../../domain/declaration-timeline';
import {
  CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY,
  type CycleActivitySnapshotRepository,
} from '../../domain/ports/cycle-activity-snapshot.repository';
import {
  PROJECT_ACTIVITY_SOURCE_REPOSITORY,
  type ProjectActivitySourceRepository,
} from '../../domain/ports/project-activity-source.repository';
import { summarizeCycleActivity } from '../../domain/services/summarize-cycle-activity';
import {
  ACCOUNT_TIME_ZONE_READER,
  type AccountTimeZoneReader,
} from '../ports/account-time-zone-reader.port';
import { CLOCK, type Clock } from '../ports/clock.port';
import {
  PROJECT_DECLARATION_READER,
  type ProjectDeclarationReader,
} from '../ports/project-declaration-reader.port';
import { toSourceViews } from '../views';
import { SYNC_TIME_LIMIT_MS, withinTimeLimit } from '../within-time-limit';

/**
 * Chụp hoạt động của một Cycle vừa khép (02 §5): chép lần cuối trong giới
 * hạn thời gian, rồi chép cứng con số. Chạy từ outbox nên phải an toàn khi
 * chạy lại: Cycle đã có snapshot thì không làm gì.
 */
@Injectable()
export class CaptureCycleSnapshotService {
  private readonly logger = new Logger(CaptureCycleSnapshotService.name);

  constructor(
    @Inject(CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY)
    private readonly snapshots: CycleActivitySnapshotRepository,
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

  async capture(input: {
    ownerId: string;
    projectId: string;
    cycleId: string;
    closedAt: Date;
  }): Promise<void> {
    const { ownerId, projectId, cycleId, closedAt } = input;
    // Mỗi Cycle tối đa một snapshot; event gửi lại không chụp lại.
    if (await this.snapshots.exists(cycleId)) return;

    // Project đã bị xóa vĩnh viễn trước khi kịp chụp: không còn gì để chụp.
    const declaration = await this.declarations.read(ownerId, projectId);
    if (!declaration) return;

    // Cycle không có nguồn lúc khép: không có snapshot (BR-PAC-029).
    const links = await this.sources.listByProject(ownerId, projectId);
    if (links.length === 0) return;

    const timeline = DeclarationTimeline.fromTransitions(
      declaration.transitions,
    );
    const cycleStart = timeline.segmentsOfCycle(cycleId)[0]?.from;
    if (!cycleStart) {
      this.logger.warn(`Cycle ${cycleId} is not on the timeline; no snapshot`);
      return;
    }

    // Lần chép cuối: thất bại hay quá giờ thì chụp từ sổ đang có (BR-PAC-030).
    // Chép tới lúc khép dù vừa chép xong; nếu không, sổ dừng trước lúc khép
    // vài phút và snapshot bị ghi là thiếu dữ liệu.
    const feedIds = links.map((link) => link.feedId);
    await withinTimeLimit(
      Promise.allSettled(
        feedIds.map((feedId) =>
          this.sync.syncFeed({
            ownerId,
            feedId,
            neededFrom: cycleStart,
            neededUntil: closedAt,
          }),
        ),
      ).then((results) =>
        results.forEach((result, index) => {
          if (result.status === 'rejected') {
            this.logger.warn(
              `Final copy of feed ${feedIds[index]} before the snapshot of cycle ${cycleId} failed: ${String(result.reason)}`,
            );
          }
        }),
      ),
      SYNC_TIME_LIMIT_MS,
    );

    const feeds = toSourceViews(
      links,
      await this.ledger.listFeeds({ ownerId, feedIds }),
    );
    const events = await this.ledger.listEvents({
      ownerId,
      feedIds,
      // Lùi thêm: đoạn code bắt đầu trước lúc Cycle mở vẫn có thể kéo dài
      // qua nó; phần trước mốc bị cắt khi tính.
      from: new Date(cycleStart.getTime() - CODING_LOOKBACK_MS),
      to: closedAt,
    });
    const timeZone = await this.timeZones.getForUser(ownerId);
    const linkedSources: LinkedSource[] = feeds.map((feed) => ({
      feedId: feed.feedId,
      linkedAt: feed.linkedAt,
      status: feed.status,
      coveredFrom: feed.coveredFrom,
      syncedUntil: feed.syncedUntil,
    }));

    const summary = summarizeCycleActivity({
      cycleId,
      timeline,
      events,
      sources: linkedSources,
      timeZone,
      until: closedAt,
      codingMeasured: feeds.some((feed) => feed.provider === 'WAKATIME'),
    });

    await this.snapshots.createIfAbsent({
      cycleId,
      metrics: summary.metrics,
      lastActivityAt: summary.lastActivityAt,
      days: summary.days,
      sources: feeds.map((feed) => ({
        provider: feed.provider,
        displayName: feed.displayName,
        coveredFrom: feed.coveredFrom,
        dataUntil: feed.syncedUntil,
      })),
      timeZone,
      dataUntil: summary.dataUntil,
      capturedAt: this.clock.now(),
    });
  }
}
