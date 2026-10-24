import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import { TOKEN_CIPHER } from '../shared/application/ports/token-cipher.port';
import { AesGcmTokenCipher } from '../shared/infrastructure/aes-gcm-token.cipher';
import { ConnectWakaTimeHandler } from './application/commands/handlers/connect-wakatime.handler';
import { DisconnectWakaTimeHandler } from './application/commands/handlers/disconnect-wakatime.handler';
import { CLOCK } from './application/ports/clock.port';
import { WAKATIME_API } from './application/ports/wakatime-api.port';
import { GetWakaTimeConnectionHandler } from './application/queries/handlers/get-wakatime-connection.handler';
import { WAKATIME_CONNECTION_REPOSITORY } from './domain/ports/wakatime-connection.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaWakaTimeConnectionRepository } from './infrastructure/repositories/prisma-wakatime-connection.repository';
import { WakaTimeHttpClient } from './infrastructure/wakatime-http.client';
import { WakaTimeIntegrationController } from './presentation/controllers/wakatime-integration.controller';

/**
 * Kết nối WakaTime (BA 08 §5.1). Adapter chép thời gian code (PR 7c) sẽ là
 * thứ duy nhất module này export — key, cipher và repository ở lại bên trong.
 */
@Module({
  imports: [CqrsModule],
  controllers: [WakaTimeIntegrationController],
  providers: [
    {
      provide: WAKATIME_CONNECTION_REPOSITORY,
      useClass: PrismaWakaTimeConnectionRepository,
    },
    // Factory: Nest không tự inject được tham số kiểu `typeof fetch`.
    { provide: WAKATIME_API, useFactory: () => new WakaTimeHttpClient() },
    {
      provide: TOKEN_CIPHER,
      inject: [ConfigService],
      useFactory: (config: ConfigService) =>
        new AesGcmTokenCipher(
          config.getOrThrow<string>('INTEGRATION_ENCRYPTION_KEY'),
        ),
    },
    { provide: CLOCK, useClass: SystemClock },
    ConnectWakaTimeHandler,
    DisconnectWakaTimeHandler,
    GetWakaTimeConnectionHandler,
  ],
})
export class WakaTimeModule {}
