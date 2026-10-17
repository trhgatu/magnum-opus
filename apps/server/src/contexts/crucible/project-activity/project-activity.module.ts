import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ActivityModule } from '@activity/activity.module';

import { LinkActivitySourceHandler } from './application/commands/handlers/link-activity-source.handler';
import { UnlinkActivitySourceHandler } from './application/commands/handlers/unlink-activity-source.handler';
import { ACCOUNT_TIME_ZONE_READER } from './application/ports/account-time-zone-reader.port';
import { CLOCK } from './application/ports/clock.port';
import { PROJECT_DECLARATION_READER } from './application/ports/project-declaration-reader.port';
import { GetProjectActivityHandler } from './application/queries/handlers/get-project-activity.handler';
import { ListActivitySourcesHandler } from './application/queries/handlers/list-activity-sources.handler';
import { ListCycleSnapshotsHandler } from './application/queries/handlers/list-cycle-snapshots.handler';
import { CaptureCycleSnapshotService } from './application/services/capture-cycle-snapshot.service';
import { CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY } from './domain/ports/cycle-activity-snapshot.repository';
import { PROJECT_ACTIVITY_SOURCE_REPOSITORY } from './domain/ports/project-activity-source.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaAccountTimeZoneReader } from './infrastructure/readers/prisma-account-time-zone.reader';
import { PrismaProjectDeclarationReader } from './infrastructure/readers/prisma-project-declaration.reader';
import { PrismaCycleActivitySnapshotRepository } from './infrastructure/repositories/prisma-cycle-activity-snapshot.repository';
import { PrismaProjectActivitySourceRepository } from './infrastructure/repositories/prisma-project-activity-source.repository';
import { ProjectActivityController } from './presentation/controllers/project-activity.controller';

/**
 * Bằng chứng hoạt động của Project: nguồn đã gắn, hoạt động của Cycle và
 * chỗ lệch với lời tuyên bố. Tầng trên cùng — đọc sổ qua module activity.
 */
@Module({
  imports: [CqrsModule, ActivityModule],
  controllers: [ProjectActivityController],
  providers: [
    {
      provide: PROJECT_ACTIVITY_SOURCE_REPOSITORY,
      useClass: PrismaProjectActivitySourceRepository,
    },
    {
      provide: CYCLE_ACTIVITY_SNAPSHOT_REPOSITORY,
      useClass: PrismaCycleActivitySnapshotRepository,
    },
    {
      provide: PROJECT_DECLARATION_READER,
      useClass: PrismaProjectDeclarationReader,
    },
    {
      provide: ACCOUNT_TIME_ZONE_READER,
      useClass: PrismaAccountTimeZoneReader,
    },
    { provide: CLOCK, useClass: SystemClock },
    LinkActivitySourceHandler,
    UnlinkActivitySourceHandler,
    GetProjectActivityHandler,
    ListActivitySourcesHandler,
    ListCycleSnapshotsHandler,
    CaptureCycleSnapshotService,
  ],
  // Outbox chụp snapshot khi nhận ProjectCycleClosed.
  exports: [CaptureCycleSnapshotService],
})
export class ProjectActivityModule {}
