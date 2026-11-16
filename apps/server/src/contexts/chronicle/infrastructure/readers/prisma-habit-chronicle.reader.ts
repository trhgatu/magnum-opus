import { Inject, Injectable } from '@nestjs/common';

import { type ChronicleSectionReader } from '../../application/ports/chronicle-section-reader.port';
import { CLOCK, type Clock } from '../../application/ports/clock.port';
import { HabitSectionData } from '../../application/section-data';
import { summarizeHabits } from '../../application/services/habit-month-summary';
import { ChroniclePeriod } from '../../domain/value-objects';
import { PrismaHabitHistoryReader } from './prisma-habit-history.reader';

@Injectable()
export class PrismaHabitChronicleReader implements ChronicleSectionReader<'habit'> {
  public readonly module = 'habit' as const;
  public readonly schemaVersion = 2;
  public readonly historyOnly = true;

  constructor(
    private readonly habitHistories: PrismaHabitHistoryReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<HabitSectionData> {
    const range = period.countableDays(this.clock.now());
    const habits = await this.habitHistories.findForOwner(
      ownerId,
      period,
      range,
    );

    return summarizeHabits(habits, range);
  }

  public upgrade(data: unknown, fromVersion: number): HabitSectionData {
    if (fromVersion !== 1) {
      throw new Error(
        `Habit Chronicle section has no upgrade path from v${fromVersion}`,
      );
    }

    const v1 = data as HabitSectionData;

    return {
      ...v1,
      bestStreak: v1.bestStreak && { ...v1.bestStreak, habitId: null },
      mostConsistentHabit: v1.mostConsistentHabit && {
        ...v1.mostConsistentHabit,
        habitId: null,
      },
      quitHabits: v1.quitHabits.map((quit) => ({ ...quit, habitId: null })),
    };
  }
}
