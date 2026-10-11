import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { ArchiveHabitHandler } from './application/commands/handlers/archive-habit.handler';
import { CreateHabitHandler } from './application/commands/handlers/create-habit.handler';
import { RestoreHabitHandler } from './application/commands/handlers/restore-habit.handler';
import { UpdateHabitHandler } from './application/commands/handlers/update-habit.handler';
import { CLOCK } from './application/ports/clock.port';
import { HABIT_READER } from './application/ports/habit-reader.port';
import { USER_TIME_ZONE_READER } from './application/ports/user-time-zone-reader.port';
import { GetHabitHandler } from './application/queries/handlers/get-habit.handler';
import { GetHabitsHandler } from './application/queries/handlers/get-habits.handler';
import {
  HabitMutationService,
  HabitTodayService,
} from './application/services';
import { HABIT_REPOSITORY } from './domain/ports/habit.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaHabitReader } from './infrastructure/readers/prisma-habit.reader';
import { PrismaUserTimeZoneReader } from './infrastructure/readers/prisma-user-time-zone.reader';
import { PrismaHabitRepository } from './infrastructure/repositories/prisma-habit.repository';
import { HabitController } from './presentation/controllers/habit.controller';

const commandHandlers = [
  ArchiveHabitHandler,
  CreateHabitHandler,
  RestoreHabitHandler,
  UpdateHabitHandler,
];
const queryHandlers = [GetHabitHandler, GetHabitsHandler];

@Module({
  imports: [CqrsModule],
  controllers: [HabitController],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: USER_TIME_ZONE_READER, useClass: PrismaUserTimeZoneReader },
    {
      provide: HABIT_REPOSITORY,
      useClass: PrismaHabitRepository,
    },
    {
      provide: HABIT_READER,
      useClass: PrismaHabitReader,
    },
    HabitMutationService,
    HabitTodayService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class HabitModule {}
