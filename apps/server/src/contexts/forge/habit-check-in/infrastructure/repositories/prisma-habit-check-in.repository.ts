import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { HabitCheckIn } from '../../domain/habit-check-in.aggregate';
import { HabitCheckInRepository } from '../../domain/ports/habit-check-in.repository';
import { HabitCheckInDate } from '../../domain/value-objects';
import { PrismaHabitCheckInMapper } from '../mappers/prisma-habit-check-in.mapper';

@Injectable()
export class PrismaHabitCheckInRepository implements HabitCheckInRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async createIfAbsent(checkIn: HabitCheckIn): Promise<HabitCheckIn> {
    const data = PrismaHabitCheckInMapper.toPersistence(checkIn);

    try {
      const created = await this.prisma.habitCheckIn.create({ data });
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

  public async deleteByHabitAndDateForOwner(
    habitId: string,
    ownerId: string,
    date: string,
  ): Promise<boolean> {
    const result = await this.prisma.habitCheckIn.deleteMany({
      where: {
        habitId,
        ownerId,
        date: HabitCheckInDate.create(date).toPersistenceDate(),
      },
    });

    return result.count === 1;
  }
}

const isUniqueConflict = (error: unknown): boolean =>
  error instanceof Prisma.PrismaClientKnownRequestError &&
  error.code === 'P2002';
