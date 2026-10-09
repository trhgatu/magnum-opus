import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { HabitLifecycleTransitionedEvent } from '../../domain/events';
import { Habit } from '../../domain/habit.aggregate';
import { HabitRepository } from '../../domain/ports/habit.repository';
import { PrismaHabitMapper } from '../mappers/prisma-habit.mapper';

@Injectable()
export class PrismaHabitRepository implements HabitRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(habit: Habit): Promise<void> {
    await this.prisma.habit.create({
      data: PrismaHabitMapper.toPersistence(habit),
    });
  }

  public async update(
    habit: Habit,
    expectedRevision: number,
  ): Promise<boolean> {
    const raw = PrismaHabitMapper.toPersistence(habit);
    const transitions = habit
      .pullDomainEvents()
      .filter(
        (event): event is HabitLifecycleTransitionedEvent =>
          event instanceof HabitLifecycleTransitionedEvent,
      )
      .map((event) => PrismaHabitMapper.transitionToPersistence(event));

    // Lịch sử lifecycle ghi cùng transaction với optimistic update: revision
    // lệch thì không có transition nào được ghi (DAP-FTH-003).
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.habit.updateMany({
        where: {
          id: raw.id,
          ownerId: raw.ownerId,
          revision: expectedRevision,
        },
        data: {
          title: raw.title,
          description: raw.description,
          frequencyType: raw.frequencyType,
          frequencyDays: raw.frequencyDays,
          quitStartedAt: raw.quitStartedAt,
          isActive: raw.isActive,
          revision: raw.revision,
          updatedAt: raw.updatedAt,
        },
      });

      if (result.count !== 1) {
        return false;
      }

      if (transitions.length > 0) {
        await transaction.habitLifecycleTransition.createMany({
          data: transitions,
        });
      }

      return true;
    });
  }

  public async findByIdForOwner(
    id: string,
    ownerId: string,
  ): Promise<Habit | null> {
    const raw = await this.prisma.habit.findFirst({
      where: {
        id,
        ownerId,
      },
      include: {
        lifecycleTransitions: {
          select: { effectiveOn: true },
          orderBy: [{ effectiveOn: 'desc' }, { occurredAt: 'desc' }],
          take: 1,
        },
      },
    });

    return raw ? PrismaHabitMapper.toDomain(raw) : null;
  }
}
