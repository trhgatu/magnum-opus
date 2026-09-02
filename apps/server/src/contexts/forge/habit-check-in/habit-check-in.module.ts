import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { CheckInHabitHandler } from './application/commands/handlers/check-in-habit.handler';
import { UndoHabitCheckInHandler } from './application/commands/handlers/undo-habit-check-in.handler';
import { CLOCK } from './application/ports/clock.port';
import { HABIT_CHECK_IN_READER } from './application/ports/habit-check-in-reader.port';
import { OWNED_HABIT_READER } from './application/ports/owned-habit-reader.port';
import { USER_TIME_ZONE_READER } from './application/ports/user-time-zone-reader.port';
import { GetHabitCheckInsHandler } from './application/queries/handlers/get-habit-check-ins.handler';
import { GetHabitCheckInTodayHandler } from './application/queries/handlers/get-habit-check-in-today.handler';
import { HabitCheckInContextService } from './application/services';
import { HABIT_CHECK_IN_REPOSITORY } from './domain/ports/habit-check-in.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaHabitCheckInReader } from './infrastructure/readers/prisma-habit-check-in.reader';
import { PrismaOwnedHabitReader } from './infrastructure/readers/prisma-owned-habit.reader';
import { PrismaUserTimeZoneReader } from './infrastructure/readers/prisma-user-time-zone.reader';
import { PrismaHabitCheckInRepository } from './infrastructure/repositories/prisma-habit-check-in.repository';
import { HabitCheckInController } from './presentation/controllers/habit-check-in.controller';

@Module({
  imports: [CqrsModule],
  controllers: [HabitCheckInController],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: OWNED_HABIT_READER, useClass: PrismaOwnedHabitReader },
    { provide: USER_TIME_ZONE_READER, useClass: PrismaUserTimeZoneReader },
    { provide: HABIT_CHECK_IN_READER, useClass: PrismaHabitCheckInReader },
    {
      provide: HABIT_CHECK_IN_REPOSITORY,
      useClass: PrismaHabitCheckInRepository,
    },
    HabitCheckInContextService,
    CheckInHabitHandler,
    UndoHabitCheckInHandler,
    GetHabitCheckInTodayHandler,
    GetHabitCheckInsHandler,
  ],
})
export class HabitCheckInModule {}
