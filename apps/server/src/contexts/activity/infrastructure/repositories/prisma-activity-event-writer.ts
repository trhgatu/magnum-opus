import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type {
  ActivityEventInput,
  TimeWindow,
} from '@shared/application/activity';
import type { ActivityEventWriter } from '../../application/ports/activity-event-writer.port';

@Injectable()
export class PrismaActivityEventWriter implements ActivityEventWriter {
  constructor(private readonly prisma: PrismaService) {}

  async append(feedId: string, events: ActivityEventInput[]): Promise<number> {
    if (events.length === 0) return 0;

    const result = await this.prisma.activityEvent.createMany({
      data: events.map((event) => ({ feedId, ...event })),
      // Khóa (feed, kind, dedupeKey) đã có → bỏ qua, không sửa dòng cũ.
      skipDuplicates: true,
    });
    return result.count;
  }

  async replace(
    feedId: string,
    windows: TimeWindow[],
    events: ActivityEventInput[],
  ): Promise<number> {
    if (windows.length === 0) return 0;

    const inWindows = events.filter((event) =>
      windows.some(
        (window) =>
          event.occurredAt >= window.from && event.occurredAt < window.to,
      ),
    );

    const [, created] = await this.prisma.$transaction([
      this.prisma.activityEvent.deleteMany({
        where: {
          feedId,
          kind: 'CODING_TIME',
          OR: windows.map((window) => ({
            occurredAt: { gte: window.from, lt: window.to },
          })),
        },
      }),
      this.prisma.activityEvent.createMany({
        data: inWindows.map((event) => ({ feedId, ...event })),
        skipDuplicates: true,
      }),
    ]);
    return created.count;
  }
}
