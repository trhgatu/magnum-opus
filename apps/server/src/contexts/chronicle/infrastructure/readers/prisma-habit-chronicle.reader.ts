import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  CLOCK,
  type ChronicleSectionReader,
  type Clock,
} from '../../application/ports';
import { HabitSectionData } from '../../application/section-data';
import { summarizeHabits } from '../../application/services/habit-month-summary';
import {
  calendarDayAt,
  calendarDayOf,
  calendarDayToDate,
} from '../../domain/calendar-day';
import { ChroniclePeriod } from '../../domain/value-objects';

@Injectable()
export class PrismaHabitChronicleReader implements ChronicleSectionReader<'habit'> {
  public readonly module = 'habit' as const;
  public readonly schemaVersion = 1;
  public readonly historyOnly = true;

  constructor(
    private readonly prisma: PrismaService,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<HabitSectionData> {
    const range = period.countableDays(this.clock.now());
    const from = calendarDayToDate(range.from);
    const to = calendarDayToDate(range.to);

    const habits = await this.prisma.habit.findMany({
      where: { ownerId, createdOn: { lt: to } },
      select: {
        title: true,
        type: true,
        createdOn: true,
        quitStartedAt: true,
        lifecycleTransitions: {
          where: { effectiveOn: { lt: to } },
          select: { action: true, effectiveOn: true },
          orderBy: [{ effectiveOn: 'asc' }, { occurredAt: 'asc' }],
        },
        scheduleVersions: {
          where: {
            effectiveFrom: { lt: to },
            OR: [{ effectiveTo: null }, { effectiveTo: { gt: from } }],
          },
          select: {
            frequencyType: true,
            frequencyDays: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        },
        checkIns: {
          where: { date: { gte: from, lt: to } },
          select: { date: true },
        },
        relapses: {
          where: { occurredAt: { lt: period.end } },
          select: { occurredAt: true },
          orderBy: { occurredAt: 'asc' },
        },
      },
      orderBy: [{ createdOn: 'asc' }, { id: 'asc' }],
    });

    return summarizeHabits(
      habits.map((habit) => {
        const quitStartedAt = habit.quitStartedAt;

        return {
          title: habit.title,
          type: habit.type,
          createdOn: calendarDayOf(habit.createdOn),
          lifecycle: habit.lifecycleTransitions.map((transition) => ({
            action: transition.action,
            effectiveOn: calendarDayOf(transition.effectiveOn),
          })),
          schedules: habit.scheduleVersions.map((version) => ({
            frequencyType: version.frequencyType,
            frequencyDays: version.frequencyDays,
            effectiveFrom: calendarDayOf(version.effectiveFrom),
            effectiveTo: version.effectiveTo
              ? calendarDayOf(version.effectiveTo)
              : null,
          })),
          checkInDays: new Set(
            habit.checkIns.map((checkIn) => calendarDayOf(checkIn.date)),
          ),
          quitStartedOn: quitStartedAt ? calendarDayOf(quitStartedAt) : null,
          relapseDays: quitStartedAt
            ? habit.relapses
                .filter((relapse) => relapse.occurredAt >= quitStartedAt)
                .map((relapse) =>
                  calendarDayAt(relapse.occurredAt, period.timeZone),
                )
            : [],
        };
      }),
      range,
    );
  }
}
