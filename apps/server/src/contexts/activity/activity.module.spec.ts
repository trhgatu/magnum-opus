import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { GitHubActivityProvider } from '@integrations/github/infrastructure/github-activity.provider';
import { WakaTimeActivityProvider } from '@integrations/wakatime/infrastructure/wakatime-activity.provider';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { ACTIVITY_PROVIDER_PORTS } from '@shared/application/activity';

import { ActivityModule } from './activity.module';
import { EnsureActivityFeedHandler } from './application/commands/handlers/ensure-activity-feed.handler';
import { ACTIVITY_EVENT_WRITER } from './application/ports/activity-event-writer.port';
import { ACTIVITY_LEDGER_READER } from './application/ports/activity-ledger-reader.port';
import { ActivitySyncService } from './application/services/activity-sync.service';
import { ACTIVITY_FEED_REPOSITORY } from './domain/ports/activity-feed.repository';
import { PrismaActivityLedgerReader } from './infrastructure/readers/prisma-activity-ledger.reader';
import { PrismaActivityEventWriter } from './infrastructure/repositories/prisma-activity-event-writer';
import { PrismaActivityFeedRepository } from './infrastructure/repositories/prisma-activity-feed.repository';

/** Thay cho các module global của AppModule (database, config). */
@Global()
@Module({
  providers: [
    { provide: PrismaService, useValue: {} },
    { provide: ConfigService, useValue: { getOrThrow: () => 'k'.repeat(32) } },
  ],
  exports: [PrismaService, ConfigService],
})
class GlobalStubsModule {}

describe('ActivityModule', () => {
  it('wires the ledger, the sync service and every activity provider', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GlobalStubsModule, ActivityModule],
    }).compile();

    expect(moduleRef.get(ACTIVITY_FEED_REPOSITORY)).toBeInstanceOf(
      PrismaActivityFeedRepository,
    );
    expect(moduleRef.get(ACTIVITY_EVENT_WRITER)).toBeInstanceOf(
      PrismaActivityEventWriter,
    );
    expect(moduleRef.get(ACTIVITY_LEDGER_READER)).toBeInstanceOf(
      PrismaActivityLedgerReader,
    );
    expect(moduleRef.get(EnsureActivityFeedHandler)).toBeInstanceOf(
      EnsureActivityFeedHandler,
    );
    expect(moduleRef.get(ActivitySyncService)).toBeInstanceOf(
      ActivitySyncService,
    );

    const providers = moduleRef.get(ACTIVITY_PROVIDER_PORTS);
    expect(providers).toHaveLength(2);
    expect(providers[0]).toBeInstanceOf(GitHubActivityProvider);
    expect(providers[1]).toBeInstanceOf(WakaTimeActivityProvider);
  });
});
