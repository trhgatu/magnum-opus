import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import type { ActivityEventInput } from '@shared/application/activity';
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
}
