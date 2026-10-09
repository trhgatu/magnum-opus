import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { HabitHistory } from '../../application/services/habit-month-summary';
import {
  CalendarDay,
  calendarDayAt,
  calendarDayOf,
  calendarDayToDate,
} from '../../domain/calendar-day';
import { ChroniclePeriod } from '../../domain/value-objects';

/**
 * Tải lịch sử Habit (lifecycle, tần suất, check-in, relapse) giới hạn trong
 * khoảng ngày được tính — dùng chung cho reader Habit và reader Routine, vì
 * "Routine có buổi vào ngày D" phụ thuộc Habit thành viên có due ngày D.
 */
@Injectable()
export class PrismaHabitHistoryReader {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * `habitIds` bỏ trống = mọi Habit của owner. Kết quả sắp theo createdOn
   * rồi id — thứ tự tie-break của summarizeHabits.
   */
  public async findForOwner(
    ownerId: string,
    period: ChroniclePeriod,
    range: { from: CalendarDay; to: CalendarDay },
    habitIds?: string[],
  ): Promise<HabitHistory[]> {
    const from = calendarDayToDate(range.from);
    const to = calendarDayToDate(range.to);

    const habits = await this.prisma.habit.findMany({
      where: {
        ownerId,
        createdOn: { lt: to },
        ...(habitIds ? { id: { in: habitIds } } : {}),
      },
      select: {
        id: true,
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

    return habits.map((habit) => {
      const quitStartedAt = habit.quitStartedAt;

      return {
        id: habit.id,
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
    });
  }
}
