import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

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

    const result = await this.prisma.habit.updateMany({
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
        isActive: raw.isActive,
        revision: raw.revision,
        updatedAt: raw.updatedAt,
      },
    });

    return result.count === 1;
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
    });

    return raw ? PrismaHabitMapper.toDomain(raw) : null;
  }
}
