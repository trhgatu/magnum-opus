import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  OwnedHabitReadModel,
  OwnedHabitReader,
} from '../../application/ports/owned-habit-reader.port';

@Injectable()
export class PrismaOwnedHabitReader implements OwnedHabitReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findByIdForOwner(
    habitId: string,
    ownerId: string,
  ): Promise<OwnedHabitReadModel | null> {
    const habit = await this.prisma.habit.findFirst({
      where: { id: habitId, ownerId },
      select: { id: true, isActive: true, type: true },
    });

    return habit
      ? { id: habit.id, isActive: habit.isActive, type: habit.type }
      : null;
  }
}
