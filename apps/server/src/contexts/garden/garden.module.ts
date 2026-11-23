import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { GARDEN_LEDGER_WRITER } from './application/ports/garden-ledger-writer.port';
import { PlantCreatedHabitHandler } from './infrastructure/outbox/plant-created-habit.handler';
import { UprootDeletedHabitHandler } from './infrastructure/outbox/uproot-deleted-habit.handler';
import { RecordHabitCheckInHandler } from './infrastructure/outbox/record-habit-check-in.handler';
import { RecordHabitCheckInUndoneHandler } from './infrastructure/outbox/record-habit-check-in-undone.handler';
import { RecordHabitRelapseHandler } from './infrastructure/outbox/record-habit-relapse.handler';
import { ReplantQuitHabitHandler } from './infrastructure/outbox/replant-quit-habit.handler';
import { HideTrashedHabitHandler } from './infrastructure/outbox/hide-trashed-habit.handler';
import { ShowRestoredHabitHandler } from './infrastructure/outbox/show-restored-habit.handler';
import { RecordHabitLifecycleHandler } from './infrastructure/outbox/record-habit-lifecycle.handler';
import { RecordHabitRhythmHandler } from './infrastructure/outbox/record-habit-rhythm.handler';
import { PrismaGardenLedgerWriter } from './infrastructure/writers/prisma-garden-ledger.writer';
import { AssignHabitBedHandler } from './infrastructure/outbox/assign-habit-bed.handler';
import { RenameHabitTreeHandler } from './infrastructure/outbox/rename-habit-tree.handler';
import { CLOCK } from './application/ports/clock.port';
import { GARDEN_LEDGER_READER } from './application/ports/garden-ledger-reader.port';
import { USER_TIME_ZONE_READER } from './application/ports/user-time-zone-reader.port';
import { GetGardenHandler } from './application/queries/handlers/get-garden.handler';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaGardenLedgerReader } from './infrastructure/readers/prisma-garden-ledger.reader';
import { PrismaUserTimeZoneReader } from './infrastructure/readers/prisma-user-time-zone.reader';
import { GardenController } from './presentation/controllers/garden.controller';

@Module({
  imports: [CqrsModule],
  controllers: [GardenController],
  providers: [
    GetGardenHandler,
    { provide: GARDEN_LEDGER_READER, useClass: PrismaGardenLedgerReader },
    { provide: USER_TIME_ZONE_READER, useClass: PrismaUserTimeZoneReader },
    { provide: CLOCK, useClass: SystemClock },
    PlantCreatedHabitHandler,
    UprootDeletedHabitHandler,
    RecordHabitCheckInHandler,
    RecordHabitCheckInUndoneHandler,
    RecordHabitRelapseHandler,
    ReplantQuitHabitHandler,
    HideTrashedHabitHandler,
    ShowRestoredHabitHandler,
    RecordHabitRhythmHandler,
    RecordHabitLifecycleHandler,
    RenameHabitTreeHandler,
    AssignHabitBedHandler,
    { provide: GARDEN_LEDGER_WRITER, useClass: PrismaGardenLedgerWriter },
  ],
})
export class GardenModule {}
