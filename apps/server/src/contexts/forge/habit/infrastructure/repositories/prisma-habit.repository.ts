import { Injectable } from '@nestjs/common';

import type { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  HabitLifecycleTransitionedEvent,
  HabitScheduleVersionStartedEvent,
} from '../../domain/events';
import { Habit } from '../../domain/habit.aggregate';
import { HabitRepository } from '../../domain/ports/habit.repository';
import {
  HabitLifecycleTransitionPersistence,
  HabitScheduleVersionPersistence,
  PrismaHabitMapper,
} from '../mappers/prisma-habit.mapper';

interface HabitHistoryWrites {
  transitions: HabitLifecycleTransitionPersistence[];
  scheduleVersions: HabitScheduleVersionPersistence[];
}

@Injectable()
export class PrismaHabitRepository implements HabitRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(habit: Habit): Promise<void> {
    const raw = PrismaHabitMapper.toPersistence(habit);
    const { scheduleVersions } = PrismaHabitRepository.pullHistory(habit);

    // Phiên bản tần suất ban đầu ghi cùng transaction với Habit: không bao giờ
    // có Habit BUILD thiếu phiên bản đang mở (02 §5).
    await this.prisma.$transaction(async (transaction) => {
      await transaction.habit.create({ data: raw });

      if (scheduleVersions.length > 0) {
        await transaction.habitScheduleVersion.createMany({
          data: scheduleVersions,
        });
      }
    });
  }

  public async update(
    habit: Habit,
    expectedRevision: number,
  ): Promise<boolean> {
    const raw = PrismaHabitMapper.toPersistence(habit);
    const { transitions, scheduleVersions } =
      PrismaHabitRepository.pullHistory(habit);

    // Lịch sử lifecycle và tần suất ghi cùng transaction với optimistic
    // update: revision lệch thì không có dòng lịch sử nào được ghi
    // (DAP-FTH-003).
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

      await PrismaHabitRepository.writeScheduleVersions(
        transaction,
        scheduleVersions,
      );

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
        // Partial unique index bảo đảm tối đa 1 phiên bản đang mở.
        scheduleVersions: {
          select: { effectiveFrom: true },
          where: { effectiveTo: null },
          take: 1,
        },
      },
    });

    return raw ? PrismaHabitMapper.toDomain(raw) : null;
  }

  private static pullHistory(habit: Habit): HabitHistoryWrites {
    const events = habit.pullDomainEvents();

    return {
      transitions: events
        .filter(
          (event): event is HabitLifecycleTransitionedEvent =>
            event instanceof HabitLifecycleTransitionedEvent,
        )
        .map((event) => PrismaHabitMapper.transitionToPersistence(event)),
      scheduleVersions: events
        .filter(
          (event): event is HabitScheduleVersionStartedEvent =>
            event instanceof HabitScheduleVersionStartedEvent,
        )
        .map((event) => PrismaHabitMapper.scheduleVersionToPersistence(event)),
    };
  }

  // Lịch sử chỉ có 2 thao tác ghi (KD-FTH-006): đóng phiên bản đang mở tại
  // ngày bắt đầu của phiên bản mới, rồi thêm phiên bản mới. Ghi tuần tự theo
  // thứ tự event để partial unique index "1 phiên bản mở / Habit" luôn đúng.
  private static async writeScheduleVersions(
    transaction: Prisma.TransactionClient,
    versions: HabitScheduleVersionPersistence[],
  ): Promise<void> {
    for (const version of versions) {
      await transaction.habitScheduleVersion.updateMany({
        where: {
          habitId: version.habitId,
          ownerId: version.ownerId,
          effectiveTo: null,
        },
        data: { effectiveTo: version.effectiveFrom },
      });
      await transaction.habitScheduleVersion.create({ data: version });
    }
  }
}
