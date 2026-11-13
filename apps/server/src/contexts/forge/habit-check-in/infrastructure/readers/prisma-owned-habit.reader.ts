import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { OwnedHabitReader } from '../../application/ports/owned-habit-reader.port';

@Injectable()
export class PrismaOwnedHabitReader implements OwnedHabitReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findByIdForOwner(habitId: string, ownerId: string) {
    const habit = await this.prisma.habit.findFirst({
      where: { id: habitId, ownerId },
      select: { id: true, state: true, type: true },
    });

    return habit
      ? { id: habit.id, isActive: habit.state === 'ACTIVE', type: habit.type }
      : null;
  }
}
