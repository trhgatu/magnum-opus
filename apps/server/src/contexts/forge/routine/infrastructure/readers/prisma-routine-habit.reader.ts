import { Injectable } from '@nestjs/common';
import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  RoutineHabitReader,
  RoutineHabitReadModel,
} from '../../application/ports/routine-habit-reader.port';

@Injectable()
export class PrismaRoutineHabitReader implements RoutineHabitReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findByIdForOwner(
    habitId: string,
    ownerId: string,
  ): Promise<RoutineHabitReadModel | null> {
    const habit = await this.prisma.habit.findFirst({
      where: {
        id: habitId,
        ownerId,
      },
      select: {
        id: true,
        state: true,
        type: true,
      },
    });

    return habit
      ? { id: habit.id, isActive: habit.state === 'ACTIVE', type: habit.type }
      : null;
  }
}
