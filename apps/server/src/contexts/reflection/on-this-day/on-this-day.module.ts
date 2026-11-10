import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ON_THIS_DAY_READER } from './application/ports/on-this-day-reader.port';
import { GetOnThisDayHandler } from './application/queries/handlers/get-on-this-day.handler';
import { PrismaOnThisDayReader } from './infrastructure/readers/prisma-on-this-day.reader';
import { OnThisDayController } from './presentation/controllers/on-this-day.controller';

@Module({
  imports: [CqrsModule],
  controllers: [OnThisDayController],
  providers: [
    GetOnThisDayHandler,
    { provide: ON_THIS_DAY_READER, useClass: PrismaOnThisDayReader },
  ],
})
export class OnThisDayModule {}
