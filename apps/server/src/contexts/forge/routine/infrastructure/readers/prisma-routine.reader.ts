import { Injectable } from '@nestjs/common';
import { Prisma } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  FindRoutinesOptions,
  FindRoutinesResult,
  RoutineReader,
} from '../../application/ports/routine-reader.port';
import { PrismaRoutineMapper } from '../mappers/prisma-routine.mapper';

@Injectable()
export class PrismaRoutineReader implements RoutineReader {
  constructor(private readonly prisma: PrismaService) {}

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
