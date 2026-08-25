import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { CheckInHabitReader } from '../../application/ports/check-in-habit-reader.port';

@Injectable()
export class PrismaCheckInHabitReader implements CheckInHabitReader {
  constructor(private readonly prisma: PrismaService) {}

  public findByIdForOwner(habitId: string, ownerId: string) {
    return this.prisma.habit.findFirst({
      where: { id: habitId, ownerId },
      select: { id: true, isActive: true },
    });
  }
}
