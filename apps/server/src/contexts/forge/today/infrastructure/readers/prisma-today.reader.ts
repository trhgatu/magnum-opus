import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  TodayHabitReadModel,
  TodayReader,
  TodayReadModel,
} from '../../application/ports/today-reader.port';
import { resolveTodayCalendarDate } from '../time/today-calendar';

interface RoutineGroup {
  id: string;
  title: string;
  habits: Array<{
    order: number;
    habit: TodayHabitReadModel;
  }>;
}

@Injectable()
export class PrismaTodayReader implements TodayReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findForOwnerAt(
    ownerId: string,
    instant: Date,
  ): Promise<TodayReadModel> {
    const owner = await this.prisma.user.findUniqueOrThrow({
      where: {
        id: ownerId,
      },
      select: {
        timeZone: true,
        _count: {
          select: {
            habits: {
              where: {
                isActive: true,
              },
            },
          },
        },
      },
    });

    const calendar = resolveTodayCalendarDate(instant, owner.timeZone);

    if (owner._count.habits === 0) {
      return {
        date: calendar.date,
        timeZone: owner.timeZone,
        emptyReason: 'NO_ACTIVE_HABITS',
        routines: [],
        standaloneHabits: [],
      };
    }

    const dueHabitWhere: Prisma.HabitWhereInput = {
      ownerId,
      isActive: true,
      OR: [
        {
          frequencyType: 'DAILY',
        },
        {
          frequencyType: 'WEEKLY',
          frequencyDays: {
            has: calendar.isoWeekday,
          },
        },
      ],
    };

    const dueHabits = await this.prisma.habit.findMany({
      where: dueHabitWhere,
      select: {
        id: true,
        title: true,
        description: true,
        routineLinks: {
          where: {
            ownerId,
            routine: {
              isActive: true,
            },
          },
          orderBy: [
            {
              order: 'asc',
            },
            {
              routineId: 'asc',
            },
          ],
          select: {
            order: true,
            routine: {
              select: {
                id: true,
                title: true,
              },
            },
          },
        },
      },
      orderBy: [
        {
          title: 'asc',
        },
        {
          id: 'asc',
        },
      ],
    });

    if (dueHabits.length === 0) {
      return {
        date: calendar.date,
        timeZone: owner.timeZone,
        emptyReason: 'NOTHING_DUE',
        routines: [],
        standaloneHabits: [],
      };
    }

    const checkIns = await this.prisma.habitCheckIn.findMany({
      where: {
        ownerId,
        date: calendar.persistenceDate,
        habitId: {
          in: dueHabits.map((habit) => habit.id),
        },
      },
      select: {
        habitId: true,
      },
    });

    const checkedInHabitIds = new Set(
      checkIns.map((checkIn) => checkIn.habitId),
    );

    const routineGroups = new Map<string, RoutineGroup>();
    const standaloneHabits: TodayHabitReadModel[] = [];

    for (const row of dueHabits) {
      const habit: TodayHabitReadModel = {
        id: row.id,
        title: row.title,
        description: row.description,
        checkedIn: checkedInHabitIds.has(row.id),
      };

      if (row.routineLinks.length === 0) {
        standaloneHabits.push(habit);
        continue;
      }

      for (const link of row.routineLinks) {
        const existingGroup = routineGroups.get(link.routine.id);

        if (existingGroup) {
          existingGroup.habits.push({
            order: link.order,
            habit,
          });

          continue;
        }

        routineGroups.set(link.routine.id, {
          id: link.routine.id,
          title: link.routine.title,
          habits: [
            {
              order: link.order,
              habit,
            },
          ],
        });
      }
    }

    const routines = Array.from(routineGroups.values())
      .sort(
        (left, right) =>
          left.title.localeCompare(right.title) ||
          left.id.localeCompare(right.id),
      )
      .map((routine) => ({
        id: routine.id,
        title: routine.title,
        habits: routine.habits
          .sort((left, right) => left.order - right.order)
          .map(({ habit }) => habit),
      }));

    return {
      date: calendar.date,
      timeZone: owner.timeZone,
      emptyReason: null,
      routines,
      standaloneHabits,
    };
  }
}
