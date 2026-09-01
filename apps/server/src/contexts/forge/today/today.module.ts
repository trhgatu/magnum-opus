import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { TODAY_CLOCK } from './application/ports/today-clock.port';
import { TODAY_READER } from './application/ports/today-reader.port';
import { GetTodayHandler } from './application/queries/handlers/get-today.handler';
import { SystemTodayClock } from './infrastructure/clock/system-today-clock';
import { PrismaTodayReader } from './infrastructure/readers/prisma-today.reader';
import { TodayController } from './presentation/controllers/today.controller';

@Module({
  imports: [CqrsModule],
  controllers: [TodayController],
  providers: [
    {
      provide: TODAY_CLOCK,
      useClass: SystemTodayClock,
    },
    {
      provide: TODAY_READER,
      useClass: PrismaTodayReader,
    },
    GetTodayHandler,
  ],
})
export class TodayModule {}
