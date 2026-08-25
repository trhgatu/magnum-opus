import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  FindHabitsOptions,
  FindHabitsResult,
  HabitReader,
} from '../../application/ports/habit-reader.port';
import { PrismaHabitMapper } from '../mappers/prisma-habit.mapper';

@Injectable()
export class PrismaHabitReader implements HabitReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findAllForOwner(
    ownerId: string,
    options: FindHabitsOptions,
  ): Promise<FindHabitsResult> {
    const search = options.search?.trim();
    const where: Prisma.HabitWhereInput = {
      ownerId,
      ...(options.isActive === undefined ? {} : { isActive: options.isActive }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };
    const sortBy = options.sortBy ?? 'updatedAt';
    const sortOrder = options.sortOrder ?? 'desc';

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.habit.findMany({
        where,
        orderBy: [{ [sortBy]: sortOrder }, { id: 'asc' }],
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.habit.count({ where }),
    ]);

    return {
      habits: rows.map((row) => PrismaHabitMapper.toDomain(row)),
      total,
    };
  }
}
