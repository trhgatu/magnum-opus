import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { CqrsModule } from '@nestjs/cqrs';
import { Test } from '@nestjs/testing';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { ConnectWakaTimeHandler } from './application/commands/handlers/connect-wakatime.handler';
import { WakaTimeModule } from './wakatime.module';

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

describe('WakaTimeModule', () => {
  it('wires the connection handlers', async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [GlobalStubsModule, CqrsModule, WakaTimeModule],
    }).compile();

    expect(moduleRef.get(ConnectWakaTimeHandler)).toBeInstanceOf(
      ConnectWakaTimeHandler,
    );
  });
});
