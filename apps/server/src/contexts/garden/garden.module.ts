import { Module } from '@nestjs/common';

import { GARDEN_LEDGER_WRITER } from './application/ports/garden-ledger-writer.port';
import { PlantCreatedHabitHandler } from './infrastructure/outbox/plant-created-habit.handler';
import { UprootDeletedHabitHandler } from './infrastructure/outbox/uproot-deleted-habit.handler';
import { PrismaGardenLedgerWriter } from './infrastructure/writers/prisma-garden-ledger.writer';

@Module({
  providers: [
    PlantCreatedHabitHandler,
    UprootDeletedHabitHandler,
    { provide: GARDEN_LEDGER_WRITER, useClass: PrismaGardenLedgerWriter },
  ],
})
export class GardenModule {}
