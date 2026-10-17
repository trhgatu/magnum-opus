import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { GITHUB_ACTIVITY_PROVIDER } from './application/ports/github-activity-provider.port';
import { GitHubModule } from './github.module';
import { GitHubActivityProvider } from './infrastructure/github-activity.provider';

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

describe('GitHubModule', () => {
  it('builds the GitHub activity provider for the activity tier', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GlobalStubsModule, GitHubModule],
    }).compile();

    expect(moduleRef.get(GITHUB_ACTIVITY_PROVIDER)).toBeInstanceOf(
      GitHubActivityProvider,
    );
  });
});
