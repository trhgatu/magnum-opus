import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  RoutineHabitReader,
  RoutineHabitReadModel,
} from '../../application/ports/routine-habit-reader.port';

@Injectable()
export class PrismaRoutineHabitReader implements RoutineHabitReader {
  constructor(private readonly prisma: PrismaService) {}

  public findByIdForOwner(
    habitId: string,
    ownerId: string,
  ): Promise<RoutineHabitReadModel | null> {
    return this.prisma.habit.findFirst({
      where: {
        id: habitId,
        ownerId,
      },
      select: {
        id: true,
        isActive: true,
      },
    });
  }
}
