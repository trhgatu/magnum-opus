import { Injectable } from '@nestjs/common';

import type { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  HabitCreatedEvent,
  HabitLifecycleTransitionedEvent,
  HabitScheduleVersionStartedEvent,
  HabitQuitStartChangedEvent,
  HabitTrashedEvent,
  HabitRestoredFromTrashEvent,
} from '../../domain/events';
import { Habit } from '../../domain/habit.aggregate';
import { HabitRepository } from '../../domain/ports/habit.repository';
import {
  HabitLifecycleTransitionPersistence,
  HabitScheduleVersionPersistence,
  PrismaHabitMapper,
} from '../mappers/prisma-habit.mapper';

import { OutboxSerializer } from '@infrastructure/event-bus/outbox/outbox-publication';
interface HabitHistoryWrites {
  transitions: HabitLifecycleTransitionPersistence[];
  scheduleVersions: HabitScheduleVersionPersistence[];
}

@Injectable()
export class PrismaHabitRepository implements HabitRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxSerializer,
  ) {}

  public async create(habit: Habit): Promise<void> {
    const raw = PrismaHabitMapper.toPersistence(habit);

    const outboxEvents = habit
      .getDomainEvents()
      .filter((event) => event instanceof HabitCreatedEvent)
      .map((event) => this.outbox.serialize(event));

    const { scheduleVersions } = PrismaHabitRepository.pullHistory(habit);

    await this.prisma.$transaction(async (transaction) => {
      await transaction.habit.create({ data: raw });
      await transaction.outboxEvent.createMany({ data: outboxEvents });
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
    const outboxEvents = habit
      .getDomainEvents()
      .filter(
        (event) =>
          event instanceof HabitQuitStartChangedEvent ||
          event instanceof HabitLifecycleTransitionedEvent ||
          event instanceof HabitTrashedEvent ||
          event instanceof HabitRestoredFromTrashEvent,
      )

      .map((event) => this.outbox.serialize(event));
    const { transitions, scheduleVersions } =
      PrismaHabitRepository.pullHistory(habit);

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
          state: raw.state,
          stateBeforeTrash: raw.stateBeforeTrash,
          trashedAt: raw.trashedAt,
          revision: raw.revision,
          updatedAt: raw.updatedAt,
        },
      });

      if (result.count !== 1) {
        return false;
      }

      if (outboxEvents.length > 0) {
        await transaction.outboxEvent.createMany({ data: outboxEvents });
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
        scheduleVersions: {
          select: { effectiveFrom: true },
          where: { effectiveTo: null },
          take: 1,
        },
      },
    });

    return raw ? PrismaHabitMapper.toDomain(raw) : null;
  }

  public async deletePermanently(
    habit: Habit,
    expectedRevision: number,
  ): Promise<boolean> {
    const outboxEvents = habit
      .getDomainEvents()
      .map((event) => this.outbox.serialize(event));

    const deleted = await this.prisma.$transaction(async (tx) => {
      const result = await tx.habit.deleteMany({
        where: {
          id: habit.id,
          ownerId: habit.ownerId,
          revision: expectedRevision,
          state: 'TRASHED',
        },
      });

      if (result.count !== 1) {
        return false;
      }

      await tx.outboxEvent.createMany({ data: outboxEvents });
      return true;
    });

    if (deleted) {
      habit.clearDomainEvents();
    }

    return deleted;
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
