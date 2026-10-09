import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  RoutineHabitAddedEvent,
  RoutineHabitRemovedEvent,
  RoutineLifecycleTransitionedEvent,
} from '../../domain/events';
import { Routine } from '../../domain/routine.aggregate';
import { RoutineRepository } from '../../domain/ports/routine.repository';
import { PrismaRoutineMapper } from '../mappers/prisma-routine.mapper';

@Injectable()
export class PrismaRoutineRepository implements RoutineRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(routine: Routine): Promise<void> {
    const raw = PrismaRoutineMapper.toPersistence(routine);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.routine.create({
        data: raw.routine,
      });

      if (raw.habits.length > 0) {
        await transaction.routineHabit.createMany({
          data: raw.habits,
        });
      }
    });
  }

  public async update(
    routine: Routine,
    expectedRevision: number,
  ): Promise<boolean> {
    const raw = PrismaRoutineMapper.toPersistence(routine);
    const events = routine.pullDomainEvents();
    const transitions = events
      .filter(
        (event): event is RoutineLifecycleTransitionedEvent =>
          event instanceof RoutineLifecycleTransitionedEvent,
      )
      .map((event) => PrismaRoutineMapper.transitionToPersistence(event));
    // Giữ đúng thứ tự sự kiện: gỡ rồi thêm lại cùng 1 Habit phải đóng khoảng
    // cũ trước khi mở khoảng mới (partial unique index 1 khoảng mở / cặp).
    const membershipEvents = events.filter(
      (event): event is RoutineHabitAddedEvent | RoutineHabitRemovedEvent =>
        event instanceof RoutineHabitAddedEvent ||
        event instanceof RoutineHabitRemovedEvent,
    );

    // Lịch sử lifecycle và thành viên ghi cùng transaction với optimistic
    // update: revision lệch thì không có dòng lịch sử nào được ghi
    // (DAP-FTH-003).
    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.routine.updateMany({
        where: {
          id: raw.routine.id,
          ownerId: raw.routine.ownerId,
          revision: expectedRevision,
        },
        data: {
          title: raw.routine.title,
          isActive: raw.routine.isActive,
          revision: raw.routine.revision,
          updatedAt: raw.routine.updatedAt,
        },
      });

      if (result.count !== 1) {
        return false;
      }

      await transaction.routineHabit.deleteMany({
        where: {
          routineId: raw.routine.id,
          ownerId: raw.routine.ownerId,
        },
      });

      if (raw.habits.length > 0) {
        await transaction.routineHabit.createMany({
          data: raw.habits,
        });
      }

      if (transitions.length > 0) {
        await transaction.routineLifecycleTransition.createMany({
          data: transitions,
        });
      }

      for (const event of membershipEvents) {
        if (event instanceof RoutineHabitAddedEvent) {
          await transaction.routineHabitMembership.create({
            data: PrismaRoutineMapper.membershipOpeningToPersistence(event),
          });
          continue;
        }

        const closing =
          PrismaRoutineMapper.membershipClosingToPersistence(event);

        await transaction.routineHabitMembership.updateMany({
          where: {
            routineId: closing.routineId,
            habitId: closing.habitId,
            ownerId: closing.ownerId,
            removedOn: null,
          },
          data: { removedOn: closing.removedOn },
        });
      }

      return true;
    });
  }

  public async findByIdForOwner(
    id: string,
    ownerId: string,
  ): Promise<Routine | null> {
    const raw = await this.prisma.routine.findFirst({
      where: {
        id,
        ownerId,
      },
      include: {
        habits: {
          orderBy: {
            order: 'asc',
          },
        },
        lifecycleTransitions: {
          select: { effectiveOn: true },
          orderBy: [{ effectiveOn: 'desc' }, { occurredAt: 'desc' }],
          take: 1,
        },
        membershipHistory: {
          select: { habitId: true, addedOn: true, removedOn: true },
        },
      },
    });

    return raw ? PrismaRoutineMapper.toDomain(raw) : null;
  }
}
