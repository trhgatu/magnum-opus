import { Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';

import {
  TOKEN_CIPHER,
  type TokenCipher,
} from '../shared/application/ports/token-cipher.port';

import { WAKATIME_ACTIVITY_PROVIDER } from './application/ports/wakatime-activity-provider.port';
import { AesGcmTokenCipher } from '../shared/infrastructure/aes-gcm-token.cipher';
import { ConnectWakaTimeHandler } from './application/commands/handlers/connect-wakatime.handler';
import { DisconnectWakaTimeHandler } from './application/commands/handlers/disconnect-wakatime.handler';
import { CLOCK } from './application/ports/clock.port';
import {
  WAKATIME_API,
  type WakaTimeApi,
} from './application/ports/wakatime-api.port';
import { GetWakaTimeConnectionHandler } from './application/queries/handlers/get-wakatime-connection.handler';
import {
  WAKATIME_CONNECTION_REPOSITORY,
  type WakaTimeConnectionRepository,
} from './domain/ports/wakatime-connection.repository';
import { WakaTimeActivityProvider } from './infrastructure/wakatime-activity.provider';

import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaWakaTimeConnectionRepository } from './infrastructure/repositories/prisma-wakatime-connection.repository';
import { WakaTimeHttpClient } from './infrastructure/wakatime-http.client';
import { WakaTimeIntegrationController } from './presentation/controllers/wakatime-integration.controller';

/**
 * Kết nối WakaTime (BA 08 §5.1) và nguồn thời gian code cho tầng activity.
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
    {
      provide: WAKATIME_ACTIVITY_PROVIDER,
      inject: [WAKATIME_CONNECTION_REPOSITORY, TOKEN_CIPHER, WAKATIME_API],
      useFactory: (
        connections: WakaTimeConnectionRepository,
        cipher: TokenCipher,
        api: WakaTimeApi,
      ) => new WakaTimeActivityProvider(connections, cipher, api),
    },

    ConnectWakaTimeHandler,
    DisconnectWakaTimeHandler,
    GetWakaTimeConnectionHandler,
  ],
  // Chỉ provider rời module: key, cipher và repository kết nối ở lại bên
  // trong, để không ai ngoài module chạm được thông tin xác thực.

  exports: [WAKATIME_ACTIVITY_PROVIDER],
})
export class WakaTimeModule {}
