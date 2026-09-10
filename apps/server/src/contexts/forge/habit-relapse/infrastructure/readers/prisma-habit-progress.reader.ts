import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  HabitProgressReadModel,
  HabitProgressReader,
} from '../../application/ports/habit-progress-reader.port';

@Injectable()
export class PrismaHabitProgressReader implements HabitProgressReader {
  constructor(private readonly prisma: PrismaService) {}

  public async getProgressFor(
    habitId: string,
    ownerId: string,
  ): Promise<HabitProgressReadModel> {
    const habit = await this.prisma.habit.findFirst({
      where: { id: habitId, ownerId },
      select: { quitStartedAt: true },
    });
    if (!habit || !habit.quitStartedAt) {
      // Callers must verify the Habit exists and is QUIT-type before
      // calling this reader (see GetHabitProgressHandler) - by then,
      // quitStartedAt is guaranteed by the aggregate invariant.
      throw new Error(
        `Invariant violated: Habit "${habitId}" has no quitStartedAt`,
      );
    }

    const mostRecentRelapse = await this.prisma.habitRelapse.findFirst({
      where: {
        habitId,
        ownerId,
        occurredAt: { gte: habit.quitStartedAt },
      },
      orderBy: { occurredAt: 'desc' },
    });

    return mostRecentRelapse
      ? { sinceDate: mostRecentRelapse.occurredAt, sinceReason: 'RELAPSE' }
      : { sinceDate: habit.quitStartedAt, sinceReason: 'QUIT_STARTED_AT' };
  }
}
