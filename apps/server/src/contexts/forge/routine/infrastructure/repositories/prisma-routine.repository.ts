import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

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
      },
    });

    return raw ? PrismaRoutineMapper.toDomain(raw) : null;
  }
}
