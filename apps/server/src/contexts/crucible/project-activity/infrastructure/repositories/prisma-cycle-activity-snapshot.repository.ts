import { Injectable } from '@nestjs/common';
import {
  ACTIVITY_DAY_STATES,
  ACTIVITY_PROVIDERS,
  type ActivityDayState,
  type ActivityProvider,
} from '@repo/contracts';
import type { CycleActivitySnapshot as PrismaSnapshot } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  CycleActivitySnapshot,
  CycleActivitySnapshotRepository,
  SnapshotSource,
} from '../../domain/ports/cycle-activity-snapshot.repository';

@Injectable()
export class PrismaCycleActivitySnapshotRepository implements CycleActivitySnapshotRepository {
  constructor(private readonly prisma: PrismaService) {}

  async exists(cycleId: string): Promise<boolean> {
    const count = await this.prisma.cycleActivitySnapshot.count({
      where: { cycleId },
    });
    return count > 0;
  }

  async createIfAbsent(snapshot: CycleActivitySnapshot): Promise<void> {
    // ON CONFLICT DO NOTHING trên cycleId: event gửi lại không ghi đè.
    await this.prisma.cycleActivitySnapshot.createMany({
      data: [
        {
          cycleId: snapshot.cycleId,
          ...snapshot.metrics,
          lastActivityAt: snapshot.lastActivityAt,
          days: snapshot.days,
          sources: snapshot.sources.map((source) => ({
            provider: source.provider,
            displayName: source.displayName,
            coveredFrom: source.coveredFrom?.toISOString() ?? null,
            dataUntil: source.dataUntil?.toISOString() ?? null,
          })),
          timeZone: snapshot.timeZone,
          dataUntil: snapshot.dataUntil,
          capturedAt: snapshot.capturedAt,
        },
      ],
      skipDuplicates: true,
    });
  }

  async listByProject(
    ownerId: string,
    projectId: string,
  ): Promise<CycleActivitySnapshot[]> {
    const rows = await this.prisma.cycleActivitySnapshot.findMany({
      // Owner qua Cycle: snapshot của Project người khác không đọc được.
      where: { cycle: { projectId, ownerId } },
      orderBy: { capturedAt: 'desc' },
    });
    return rows.map(toSnapshot);
  }
}

function toSnapshot(row: PrismaSnapshot): CycleActivitySnapshot {
  return {
    cycleId: row.cycleId,
    metrics: {
      activeDays: row.activeDays,
      pausedActiveDays: row.pausedActiveDays,
      commits: row.commits,
      prsOpened: row.prsOpened,
      prsMerged: row.prsMerged,
    },
    lastActivityAt: row.lastActivityAt,
    days: readDays(row.days),
    sources: readSources(row.sources),
    timeZone: row.timeZone,
    dataUntil: row.dataUntil,
    capturedAt: row.capturedAt,
  };
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const dateOrNull = (value: unknown): Date | null =>
  typeof value === 'string' ? new Date(value) : null;

/** JSON do chính mình ghi; dòng nào sai hình dạng thì bỏ, không làm hỏng cả trang. */
function readDays(json: unknown): CycleActivitySnapshot['days'] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((day) =>
    isRecord(day) &&
    typeof day.date === 'string' &&
    (ACTIVITY_DAY_STATES as readonly unknown[]).includes(day.state)
      ? [{ date: day.date, state: day.state as ActivityDayState }]
      : [],
  );
}

function readSources(json: unknown): SnapshotSource[] {
  if (!Array.isArray(json)) return [];
  return json.flatMap((source) =>
    isRecord(source) &&
    typeof source.displayName === 'string' &&
    (ACTIVITY_PROVIDERS as readonly unknown[]).includes(source.provider)
      ? [
          {
            provider: source.provider as ActivityProvider,
            displayName: source.displayName,
            coveredFrom: dateOrNull(source.coveredFrom),
            dataUntil: dateOrNull(source.dataUntil),
          },
        ]
      : [],
  );
}
