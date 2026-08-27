import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  FindRoutinesOptions,
  FindRoutinesResult,
  RoutineDetailReadModel,
  RoutineReader,
} from '../../application/ports/routine-reader.port';
import { PrismaRoutineMapper } from '../mappers/prisma-routine.mapper';

@Injectable()
export class PrismaRoutineReader implements RoutineReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findByIdForOwner(
    routineId: string,
    ownerId: string,
  ): Promise<RoutineDetailReadModel | null> {
    const row = await this.prisma.routine.findFirst({
      where: {
        id: routineId,
        ownerId,
      },
      select: {
        id: true,
        title: true,
        isActive: true,
        revision: true,
        createdAt: true,
        updatedAt: true,
        habits: {
          orderBy: {
            order: 'asc',
          },
          select: {
            order: true,
            habit: {
              select: {
                id: true,
                title: true,
                isActive: true,
              },
            },
          },
        },
      },
    });

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      title: row.title,
      isActive: row.isActive,
      revision: row.revision,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      habits: row.habits.map(({ habit, order }) => ({
        id: habit.id,
        title: habit.title,
        isActive: habit.isActive,
        order,
      })),
    };
  }

  public async findAllForOwner(
    ownerId: string,
    options: FindRoutinesOptions,
  ): Promise<FindRoutinesResult> {
    const search = options.search?.trim();

    const where: Prisma.RoutineWhereInput = {
      ownerId,
      ...(options.isActive === undefined
        ? {}
        : {
            isActive: options.isActive,
          }),
      ...(search
        ? {
            title: {
              contains: search,
              mode: 'insensitive',
            },
          }
        : {}),
    };
    const sortBy = options.sortBy ?? 'updatedAt';
    const sortOrder = options.sortOrder ?? 'desc';

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.routine.findMany({
        where,
        include: {
          habits: {
            orderBy: {
              order: 'asc',
            },
          },
        },
        orderBy: [
          {
            [sortBy]: sortOrder,
          },
          {
            id: 'asc',
          },
        ],
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.routine.count({
        where,
      }),
    ]);

    return {
      routines: rows.map((row) => PrismaRoutineMapper.toDomain(row)),
      total,
    };
  }
}
