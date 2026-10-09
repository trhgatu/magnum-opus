import { Inject, Injectable } from '@nestjs/common';

import {
  CLOCK,
  type ChronicleSectionReader,
  type Clock,
} from '../../application/ports';
import { HabitSectionData } from '../../application/section-data';
import { summarizeHabits } from '../../application/services/habit-month-summary';
import { ChroniclePeriod } from '../../domain/value-objects';
import { PrismaHabitHistoryReader } from './prisma-habit-history.reader';

@Injectable()
export class PrismaHabitChronicleReader implements ChronicleSectionReader<'habit'> {
  public readonly module = 'habit' as const;
  public readonly schemaVersion = 1;
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
}
