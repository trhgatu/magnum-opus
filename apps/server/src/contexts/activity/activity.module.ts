import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { GITHUB_ACTIVITY_PROVIDER } from '@integrations/github/application/ports/github-activity-provider.port';
import { WAKATIME_ACTIVITY_PROVIDER } from '@integrations/wakatime/application/ports/wakatime-activity-provider.port';

import { IntegrationsModule } from '@integrations/integrations.module';
import {
  ACTIVITY_PROVIDER_PORTS,
  type ActivityProviderPort,
} from '@shared/application/activity';

import { EnsureActivityFeedHandler } from './application/commands/handlers/ensure-activity-feed.handler';
import { ACTIVITY_EVENT_WRITER } from './application/ports/activity-event-writer.port';
import { ACTIVITY_LEDGER_READER } from './application/ports/activity-ledger-reader.port';
import { CLOCK } from './application/ports/clock.port';
import { ActivityFeedService } from './application/services/activity-feed.service';
import { ActivitySyncService } from './application/services/activity-sync.service';
import { ACTIVITY_FEED_REPOSITORY } from './domain/ports/activity-feed.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaActivityLedgerReader } from './infrastructure/readers/prisma-activity-ledger.reader';
import { PrismaActivityEventWriter } from './infrastructure/repositories/prisma-activity-event-writer';
import { PrismaActivityFeedRepository } from './infrastructure/repositories/prisma-activity-feed.repository';

/**
 * Sổ hoạt động: feed của từng tài nguyên bên ngoài và các event đã chép.
 * Tầng giữa của Project Activity — đọc integrations, cho project-activity đọc.
 */
@Module({
  imports: [CqrsModule, IntegrationsModule],
  providers: [
    {
      provide: ACTIVITY_FEED_REPOSITORY,
      useClass: PrismaActivityFeedRepository,
    },
    { provide: ACTIVITY_EVENT_WRITER, useClass: PrismaActivityEventWriter },
    { provide: ACTIVITY_LEDGER_READER, useClass: PrismaActivityLedgerReader },
    { provide: CLOCK, useClass: SystemClock },
    {
      // Mỗi integration thêm provider của mình vào đây (vd WakaTime sau này).
      provide: ACTIVITY_PROVIDER_PORTS,
      inject: [GITHUB_ACTIVITY_PROVIDER, WAKATIME_ACTIVITY_PROVIDER],
      useFactory: (
        github: ActivityProviderPort,
        wakaTime: ActivityProviderPort,
      ): ActivityProviderPort[] => [github, wakaTime],
    },
    ActivityFeedService,
    ActivitySyncService,
    EnsureActivityFeedHandler,
  ],
  // Tầng project-activity lấy feed, chép và đọc sổ qua đây — không chạm
  // provider hay repository.
  exports: [ActivityFeedService, ActivitySyncService, ACTIVITY_LEDGER_READER],
})
export class ActivityModule {}
