import { Global, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { ActivityModule } from './activity.module';
import { EnsureActivityFeedHandler } from './application/commands/handlers/ensure-activity-feed.handler';
import { ACTIVITY_EVENT_WRITER } from './application/ports/activity-event-writer.port';
import { ACTIVITY_FEED_REPOSITORY } from './domain/ports/activity-feed.repository';
import { PrismaActivityEventWriter } from './infrastructure/repositories/prisma-activity-event-writer';
import { PrismaActivityFeedRepository } from './infrastructure/repositories/prisma-activity-feed.repository';

/** Thay cho module database global của AppModule. */
@Global()
@Module({
  providers: [{ provide: PrismaService, useValue: {} }],
  exports: [PrismaService],
})
class GlobalStubsModule {}

describe('ActivityModule', () => {
  it('wires the ledger and the feed command', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GlobalStubsModule, ActivityModule],
    }).compile();

    expect(moduleRef.get(ACTIVITY_FEED_REPOSITORY)).toBeInstanceOf(
      PrismaActivityFeedRepository,
    );
    expect(moduleRef.get(ACTIVITY_EVENT_WRITER)).toBeInstanceOf(
      PrismaActivityEventWriter,
    );
    expect(moduleRef.get(EnsureActivityFeedHandler)).toBeInstanceOf(
      EnsureActivityFeedHandler,
    );
  });
});
