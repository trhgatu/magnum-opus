import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { LinkActivitySourceHandler } from './application/commands/handlers/link-activity-source.handler';
import { UnlinkActivitySourceHandler } from './application/commands/handlers/unlink-activity-source.handler';
import { GetProjectActivityHandler } from './application/queries/handlers/get-project-activity.handler';
import { ListActivitySourcesHandler } from './application/queries/handlers/list-activity-sources.handler';
import { ProjectActivityModule } from './project-activity.module';

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

describe('ProjectActivityModule', () => {
  it('wires every handler through the activity tier', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GlobalStubsModule, ProjectActivityModule],
    }).compile();

    for (const handler of [
      LinkActivitySourceHandler,
      UnlinkActivitySourceHandler,
      GetProjectActivityHandler,
      ListActivitySourcesHandler,
    ]) {
      expect(moduleRef.get(handler)).toBeInstanceOf(handler);
    }
  });
});
