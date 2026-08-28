import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';

import { AddRoutineHabitHandler } from './application/commands/handlers/add-routine-habit.handler';
import { ArchiveRoutineHandler } from './application/commands/handlers/archive-routine.handler';
import { CreateRoutineHandler } from './application/commands/handlers/create-routine.handler';
import { MoveRoutineHabitDownHandler } from './application/commands/handlers/move-routine-habit-down.handler';
import { MoveRoutineHabitUpHandler } from './application/commands/handlers/move-routine-habit-up.handler';
import { RemoveRoutineHabitHandler } from './application/commands/handlers/remove-routine-habit.handler';
import { RestoreRoutineHandler } from './application/commands/handlers/restore-routine.handler';
import { UpdateRoutineTitleHandler } from './application/commands/handlers/update-routine-title.handler';
import { GetAvailableRoutineHabitsHandler } from './application/queries/handlers/get-available-routine-habits.handler';
import { ROUTINE_HABIT_READER } from './application/ports/routine-habit-reader.port';
import { ROUTINE_READER } from './application/ports/routine-reader.port';
import { GetRoutineHandler } from './application/queries/handlers/get-routine.handler';
import { GetRoutinesHandler } from './application/queries/handlers/get-routines.handler';
import { RoutineMutationService } from './application/services';
import { ROUTINE_REPOSITORY } from './domain/ports/routine.repository';
import { PrismaRoutineHabitReader } from './infrastructure/readers/prisma-routine-habit.reader';
import { PrismaRoutineReader } from './infrastructure/readers/prisma-routine.reader';
import { PrismaRoutineRepository } from './infrastructure/repositories/prisma-routine.repository';
import { RoutineController } from './presentation/controllers/routine.controller';

const commandHandlers = [
  AddRoutineHabitHandler,
  ArchiveRoutineHandler,
  CreateRoutineHandler,
  MoveRoutineHabitDownHandler,
  MoveRoutineHabitUpHandler,
  RemoveRoutineHabitHandler,
  RestoreRoutineHandler,
  UpdateRoutineTitleHandler,
];

const queryHandlers = [
  GetAvailableRoutineHabitsHandler,
  GetRoutineHandler,
  GetRoutinesHandler,
];

@Module({
  imports: [CqrsModule],
  controllers: [RoutineController],
  providers: [
    {
      provide: ROUTINE_REPOSITORY,
      useClass: PrismaRoutineRepository,
    },
    {
      provide: ROUTINE_READER,
      useClass: PrismaRoutineReader,
    },
    {
      provide: ROUTINE_HABIT_READER,
      useClass: PrismaRoutineHabitReader,
    },
    RoutineMutationService,
    ...commandHandlers,
    ...queryHandlers,
  ],
})
export class RoutineModule {}
