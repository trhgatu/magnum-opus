import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { LogRelapseHandler } from './application/commands/handlers/log-relapse.handler';
import { CLOCK } from './application/ports/clock.port';
import { HABIT_PROGRESS_READER } from './application/ports/habit-progress-reader.port';
import { OWNED_HABIT_READER } from './application/ports/owned-habit-reader.port';
import { USER_TIME_ZONE_READER } from './application/ports/user-time-zone-reader.port';
import { GetHabitProgressHandler } from './application/queries/handlers/get-habit-progress.handler';
import { HABIT_RELAPSE_REPOSITORY } from './domain/ports/habit-relapse.repository';
import { SystemClock } from './infrastructure/clock/system-clock';
import { PrismaHabitProgressReader } from './infrastructure/readers/prisma-habit-progress.reader';
import { PrismaOwnedHabitReader } from './infrastructure/readers/prisma-owned-habit.reader';
import { PrismaUserTimeZoneReader } from './infrastructure/readers/prisma-user-time-zone.reader';
import { PrismaHabitRelapseRepository } from './infrastructure/repositories/prisma-habit-relapse.repository';
import { HabitRelapseController } from './presentation/controllers/habit-relapse.controller';

@Module({
  imports: [CqrsModule],
  controllers: [HabitRelapseController],
  providers: [
    { provide: CLOCK, useClass: SystemClock },
    { provide: OWNED_HABIT_READER, useClass: PrismaOwnedHabitReader },
    { provide: USER_TIME_ZONE_READER, useClass: PrismaUserTimeZoneReader },
    { provide: HABIT_PROGRESS_READER, useClass: PrismaHabitProgressReader },
    {
      provide: HABIT_RELAPSE_REPOSITORY,
      useClass: PrismaHabitRelapseRepository,
    },
    LogRelapseHandler,
    GetHabitProgressHandler,
  ],
})
export class HabitRelapseModule {}
