import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';
import { OutboxSerializer } from '@infrastructure/event-bus/outbox/outbox-publication';
import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { HabitCheckInRepository } from '../../domain/ports/habit-check-in.repository';
import { HabitCheckInDate } from '../../domain/value-objects';
import { PrismaHabitCheckInMapper } from '../mappers/prisma-habit-check-in.mapper';

@Injectable()
export class PrismaHabitCheckInRepository implements HabitCheckInRepository {
  constructor(
    private readonly prisma: PrismaService,
    private readonly outbox: OutboxSerializer,
  ) {}

  public async createIfAbsent(checkIn: HabitCheckIn): Promise<HabitCheckIn> {
    const data = PrismaHabitCheckInMapper.toPersistence(checkIn);
    const outboxEvents = checkIn
      .getDomainEvents()
      .map((event) => this.outbox.serialize(event));

    try {
      const created = await this.prisma.$transaction(async (transaction) => {
        const row = await transaction.habitCheckIn.create({ data });
        await transaction.outboxEvent.createMany({ data: outboxEvents });
        return row;
      });
      return PrismaHabitCheckInMapper.toDomain(created);
    } catch (error: unknown) {
      if (!isUniqueConflict(error)) {
        throw error;
      }

      const existing = await this.findByHabitAndDateForOwner(
        checkIn.habitId,
        checkIn.ownerId,
        checkIn.date.value,
      );
      if (!existing) {
        throw error;
      }
      return existing;
    }
  }

  public async findByHabitAndDateForOwner(
    habitId: string,
    ownerId: string,
    date: string,
  ): Promise<HabitCheckIn | null> {
    const raw = await this.prisma.habitCheckIn.findFirst({
      where: {
        habitId,
        ownerId,
        date: HabitCheckInDate.create(date).toPersistenceDate(),
      },
    });

    return raw ? PrismaHabitCheckInMapper.toDomain(raw) : null;
  }

  public async delete(checkIn: HabitCheckIn): Promise<boolean> {
    const outboxEvents = checkIn
      .getDomainEvents()
      .map((event) => this.outbox.serialize(event));

    return this.prisma.$transaction(async (transaction) => {
      const { count } = await transaction.habitCheckIn.deleteMany({
        where: { id: checkIn.id, ownerId: checkIn.ownerId },
      });
      if (count === 0) return false;
      await transaction.outboxEvent.createMany({ data: outboxEvents });
      return true;
    });
  }
}

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
