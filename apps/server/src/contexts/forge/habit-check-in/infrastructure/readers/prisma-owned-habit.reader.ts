import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { OwnedHabitReader } from '../../application/ports/owned-habit-reader.port';

@Injectable()
export class PrismaOwnedHabitReader implements OwnedHabitReader {
  constructor(private readonly prisma: PrismaService) {}

  public findByIdForOwner(habitId: string, ownerId: string) {
    return this.prisma.habit.findFirst({
      where: { id: habitId, ownerId },
      select: { id: true, isActive: true },
    });
  }
}
