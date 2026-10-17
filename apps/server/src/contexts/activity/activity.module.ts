import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { EnsureActivityFeedHandler } from './application/commands/handlers/ensure-activity-feed.handler';
import { ACTIVITY_EVENT_WRITER } from './application/ports/activity-event-writer.port';
import { CLOCK } from './application/ports/clock.port';
import { ACTIVITY_FEED_REPOSITORY } from './domain/ports/activity-feed.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaActivityEventWriter } from './infrastructure/repositories/prisma-activity-event-writer';
import { PrismaActivityFeedRepository } from './infrastructure/repositories/prisma-activity-feed.repository';

/**
 * Sổ hoạt động: feed của từng tài nguyên bên ngoài và các event đã chép.
 * Tầng giữa của Project Activity — đọc integrations, cho project-activity đọc.
 */
@Module({
  imports: [CqrsModule],
  providers: [
    {
      provide: ACTIVITY_FEED_REPOSITORY,
      useClass: PrismaActivityFeedRepository,
    },
    { provide: ACTIVITY_EVENT_WRITER, useClass: PrismaActivityEventWriter },
    { provide: CLOCK, useClass: SystemClock },
    EnsureActivityFeedHandler,
  ],
})
export class ActivityModule {}
