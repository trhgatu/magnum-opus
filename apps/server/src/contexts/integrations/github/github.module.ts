import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { ConnectGitHubHandler } from './application/commands/handlers/connect-github.handler';
import { DisconnectGitHubHandler } from './application/commands/handlers/disconnect-github.handler';
import { CLOCK, type Clock } from './application/ports/clock.port';
import {
  GITHUB_ACTIVITY_API,
  type GitHubActivityApi,
} from './application/ports/github-activity-api.port';
import {
  GITHUB_API,
  type GitHubApi,
} from './application/ports/github-api.port';
import {
  TOKEN_CIPHER,
  type TokenCipher,
} from './application/ports/token-cipher.port';
import { GetGitHubConnectionHandler } from './application/queries/handlers/get-github-connection.handler';
import { ListGitHubRepositoriesHandler } from './application/queries/handlers/list-github-repositories.handler';
import {
  GITHUB_CONNECTION_REPOSITORY,
  type GitHubConnectionRepository,
} from './domain/ports/github-connection.repository';
import { AesGcmTokenCipher } from './infrastructure/aes-gcm-token.cipher';
import { SystemClock } from './infrastructure/clock/system-clock';
import { GitHubActivityProvider } from './infrastructure/github-activity.provider';
import { GitHubGraphqlClient } from './infrastructure/github-graphql.client';
import { GitHubRestClient } from './infrastructure/github-rest.client';
import { PrismaGitHubConnectionRepository } from './infrastructure/repositories/prisma-github-connection.repository';
import { GitHubIntegrationController } from './presentation/controllers/github-integration.controller';

/**
 * ActivityProviderPort của GitHub, cho tầng activity (PR3) gom vào
 * ACTIVITY_PROVIDER_PORTS. Chỉ token này rời module — token và cipher thì không.
 */
export const GITHUB_ACTIVITY_PROVIDER = Symbol('GITHUB_ACTIVITY_PROVIDER');

@Module({
  imports: [CqrsModule],
  controllers: [GitHubIntegrationController],
  providers: [
    {
      provide: GITHUB_CONNECTION_REPOSITORY,
      useClass: PrismaGitHubConnectionRepository,
    },
    // Factory: Nest không tự inject được tham số kiểu `typeof fetch`.
    { provide: GITHUB_API, useFactory: () => new GitHubRestClient() },
    {
      provide: GITHUB_ACTIVITY_API,
      useFactory: () => new GitHubGraphqlClient(),
    },
    {
      provide: TOKEN_CIPHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new AesGcmTokenCipher(
          config.getOrThrow<string>('INTEGRATION_ENCRYPTION_KEY'),
        ),
    },
    { provide: CLOCK, useClass: SystemClock },
    {
      provide: GITHUB_ACTIVITY_PROVIDER,
      inject: [
        GITHUB_CONNECTION_REPOSITORY,
        TOKEN_CIPHER,
        GITHUB_API,
        GITHUB_ACTIVITY_API,
        CLOCK,
      ],
      useFactory: (
        connections: GitHubConnectionRepository,
        cipher: TokenCipher,
        gitHubApi: GitHubApi,
        activityApi: GitHubActivityApi,
        clock: Clock,
      ) =>
        new GitHubActivityProvider(
          connections,
          cipher,
          gitHubApi,
          activityApi,
          clock,
        ),
    },
    ConnectGitHubHandler,
    DisconnectGitHubHandler,
    GetGitHubConnectionHandler,
    ListGitHubRepositoriesHandler,
  ],
  // TOKEN_CIPHER không export: chỉ code bên trong module này giải mã token.
  exports: [GITHUB_CONNECTION_REPOSITORY, GITHUB_ACTIVITY_PROVIDER],
})
export class GitHubModule {}
