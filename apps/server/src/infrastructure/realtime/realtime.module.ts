import { Global, Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { RealtimeGateway } from './realtime.gateway';
import { SocketIoRealtimeAdapter } from './socket-io-realtime.adapter';
import { REALTIME_PORT } from '@shared/application/ports/realtime.port';
import { AuthModule } from '@iam/auth/auth.module';

@Global()
@Module({
  imports: [JwtModule.register({}), AuthModule],
  providers: [
    RealtimeGateway,
    SocketIoRealtimeAdapter,
    {
      provide: REALTIME_PORT,
      useExisting: SocketIoRealtimeAdapter,
    },
  ],
  exports: [REALTIME_PORT],
})
export class RealtimeModule {}
