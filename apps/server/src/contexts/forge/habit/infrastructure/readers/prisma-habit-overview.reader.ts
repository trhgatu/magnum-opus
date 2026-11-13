import { Injectable } from '@nestjs/common';
import type { Prisma } from '@repo/database';
import { PrismaService } from '@infrastructure/database/prisma.service';
import { calendarDayAt, calendarDayOf } from '@shared/domain/calendar-day';

import type {
  HabitOverviewReader,
  HabitOverviewRow,
} from '../../application/ports/habit-overview-reader.port';

@Injectable()
export class PrismaHabitOverviewReader implements HabitOverviewReader {
  constructor(private readonly prisma: PrismaService) {}

  private async load(
    where: Prisma.HabitWhereInput,
    ownerId: string,
    timeZone: string,
  ): Promise<HabitOverviewRow[]> {
    const habits = await this.prisma.habit.findMany({
      where,
      select: {
        id: true,
        title: true,
        description: true,
        type: true,
        frequencyType: true,
        frequencyDays: true,
        createdOn: true,
        quitStartedAt: true,
        lifecycleTransitions: {
          select: { action: true, effectiveOn: true },
          orderBy: [{ effectiveOn: 'asc' }, { occurredAt: 'asc' }],
        },
        scheduleVersions: {
          select: {
            frequencyType: true,
            frequencyDays: true,
            effectiveFrom: true,
            effectiveTo: true,
          },
        },
        // Cả lịch sử: chuỗi dài nhất cần mọi ngày từ lúc tạo.
        checkIns: { select: { date: true, createdAt: true } },
        relapses: { select: { occurredAt: true } },
        routineLinks: {
          where: { ownerId, routine: { isActive: true } },
          orderBy: [{ routine: { title: 'asc' } }, { routineId: 'asc' }],
          select: { routine: { select: { id: true, title: true } } },
        },
      },
      orderBy: [{ title: 'asc' }, { id: 'asc' }],
    });

    return habits.map((habit) => {
      const quitStartedOn = habit.quitStartedAt
        ? calendarDayOf(habit.quitStartedAt)
        : null;

      return {
        id: habit.id,
        title: habit.title,
        description: habit.description,
        type: habit.type,
        frequencyType: habit.frequencyType,
        frequencyDays: habit.frequencyDays,
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
        checkInAt: new Map(
          habit.checkIns.map((checkIn) => [
            calendarDayOf(checkIn.date),
            checkIn.createdAt,
          ]),
        ),
        quitStartedOn,
        // Theo ngày lịch của owner, cùng quy tắc với Chronicle (BR-HAB2-004):
        // tái phạm sáng sớm ngày bắt đầu bỏ vẫn tính.
        relapseDays: new Set(
          quitStartedOn
            ? habit.relapses
                .map((relapse) => calendarDayAt(relapse.occurredAt, timeZone))
                .filter((day) => day >= quitStartedOn)
            : [],
        ),
        routines: habit.routineLinks.map((link) => link.routine),
      };
    });
  }
  public findActiveForOwner(ownerId: string, timeZone: string) {
    return this.load({ ownerId, state: 'ACTIVE' }, ownerId, timeZone);
  }

  public async findOneForOwner(
    ownerId: string,
    habitId: string,
    timeZone: string,
  ) {
    const [habit] = await this.load(
      { id: habitId, ownerId },
      ownerId,
      timeZone,
    );
    return habit ?? null;
  }
}
