import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { ConnectGitHubHandler } from './application/commands/handlers/connect-github.handler';
import { DisconnectGitHubHandler } from './application/commands/handlers/disconnect-github.handler';
import { CLOCK } from './application/ports/clock.port';
import { GITHUB_API } from './application/ports/github-api.port';
import { TOKEN_CIPHER } from './application/ports/token-cipher.port';
import { GetGitHubConnectionHandler } from './application/queries/handlers/get-github-connection.handler';
import { ListGitHubRepositoriesHandler } from './application/queries/handlers/list-github-repositories.handler';
import { GITHUB_CONNECTION_REPOSITORY } from './domain/ports/github-connection.repository';
import { AesGcmTokenCipher } from './infrastructure/aes-gcm-token.cipher';
import { SystemClock } from './infrastructure/clock/system-clock';
import { GitHubRestClient } from './infrastructure/github-rest.client';
import { PrismaGitHubConnectionRepository } from './infrastructure/repositories/prisma-github-connection.repository';
import { GitHubIntegrationController } from './presentation/controllers/github-integration.controller';

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
      provide: TOKEN_CIPHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new AesGcmTokenCipher(
          config.getOrThrow<string>('INTEGRATION_ENCRYPTION_KEY'),
        ),
    },
    { provide: CLOCK, useClass: SystemClock },
    ConnectGitHubHandler,
    DisconnectGitHubHandler,
    GetGitHubConnectionHandler,
    ListGitHubRepositoriesHandler,
  ],
  // TOKEN_CIPHER không export: chỉ code bên trong module này giải mã token.
  exports: [GITHUB_CONNECTION_REPOSITORY],
})
export class GitHubModule {}
