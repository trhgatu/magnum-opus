import { Inject, Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { type ChronicleSectionReader } from '../../application/ports/chronicle-section-reader.port';
import { CLOCK, type Clock } from '../../application/ports/clock.port';
import { RoutineSectionData } from '../../application/section-data';
import { summarizeRoutines } from '../../application/services/routine-month-summary';
import { calendarDayOf, calendarDayToDate } from '../../domain/calendar-day';
import { ChroniclePeriod } from '../../domain/value-objects';
import { PrismaHabitHistoryReader } from './prisma-habit-history.reader';

@Injectable()
export class PrismaRoutineChronicleReader implements ChronicleSectionReader<'routine'> {
  public readonly module = 'routine' as const;
  public readonly schemaVersion = 1;
  public readonly historyOnly = true;

  constructor(
    private readonly prisma: PrismaService,
    private readonly habitHistories: PrismaHabitHistoryReader,
    @Inject(CLOCK)
    private readonly clock: Clock,
  ) {}

  public async getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<RoutineSectionData> {
    const range = period.countableDays(this.clock.now());
    const from = calendarDayToDate(range.from);
    const to = calendarDayToDate(range.to);

    const routines = await this.prisma.routine.findMany({
      where: { ownerId, createdOn: { lt: to } },
      select: {
        createdOn: true,
        lifecycleTransitions: {
          where: { effectiveOn: { lt: to } },
          select: { action: true, effectiveOn: true },
          orderBy: [{ effectiveOn: 'asc' }, { occurredAt: 'asc' }],
        },
        membershipHistory: {
          where: {
            addedOn: { lt: to },
            OR: [{ removedOn: null }, { removedOn: { gt: from } }],
          },
          select: { habitId: true, addedOn: true, removedOn: true },
        },
      },
    });

    const habitIds = [
      ...new Set(
        routines.flatMap((routine) =>
          routine.membershipHistory.map((entry) => entry.habitId),
        ),
      ),
    ];

    if (habitIds.length === 0) {
      return summarizeRoutines([], range);
    }

    const habits = new Map(
      (
        await this.habitHistories.findForOwner(ownerId, period, range, habitIds)
      ).map((habit) => [habit.id, habit]),
    );

    return summarizeRoutines(
      routines.map((routine) => ({
        createdOn: calendarDayOf(routine.createdOn),
        lifecycle: routine.lifecycleTransitions.map((transition) => ({
          action: transition.action,
          effectiveOn: calendarDayOf(transition.effectiveOn),
        })),
        memberships: routine.membershipHistory.flatMap((entry) => {
          const habit = habits.get(entry.habitId);

          // Habit tạo sau khoảng ngày được tính thì không được tải — nó
          // không thể đến hạn trong kỳ nên bỏ qua khoảng thành viên đó.
          return habit
            ? [
                {
                  habit,
                  addedOn: calendarDayOf(entry.addedOn),
                  removedOn: entry.removedOn
                    ? calendarDayOf(entry.removedOn)
                    : null,
                },
              ]
            : [];
        }),
      })),
      range,
    );
  }
}
