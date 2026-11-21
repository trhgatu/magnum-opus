import { Module } from '@nestjs/common';

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
import { RenameHabitTreeHandler } from './infrastructure/outbox/rename-habit-tree.handler';

@Module({
  providers: [
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
    { provide: GARDEN_LEDGER_WRITER, useClass: PrismaGardenLedgerWriter },
  ],
})
export class GardenModule {}
