import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ON_THIS_DAY_READER } from './application/ports/on-this-day-reader.port';
import { GetOnThisDayHandler } from './application/queries/handlers/get-on-this-day.handler';
import { PrismaOnThisDayReader } from './infrastructure/readers/prisma-on-this-day.reader';
import { PrismaOnThisDayOpeningsWriter } from './infrastructure/writers/prisma-on-this-day-openings.writer';
import { OnThisDayController } from './presentation/controllers/on-this-day.controller';
import { OpenOnThisDayItemHandler } from './application/commands/handlers/open-on-this-day-item.handler';
import { OnThisDayOutbox } from './infrastructure/outbox/on-this-day.outbox';
import { ON_THIS_DAY_OPENINGS } from './application/ports/on-this-day-openings.port';

@Module({
  imports: [CqrsModule],
  controllers: [OnThisDayController],
  providers: [
    GetOnThisDayHandler,
    OpenOnThisDayItemHandler,
    OnThisDayOutbox,
    { provide: ON_THIS_DAY_READER, useClass: PrismaOnThisDayReader },
    { provide: ON_THIS_DAY_OPENINGS, useClass: PrismaOnThisDayOpeningsWriter },
  ],
})
export class OnThisDayModule {}
