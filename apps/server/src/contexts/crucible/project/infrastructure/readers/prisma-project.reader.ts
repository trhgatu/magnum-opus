import { Injectable } from '@nestjs/common';
import {
  Prisma,
  ProjectLifecycleState as PrismaProjectLifecycleState,
} from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import {
  FindProjectsOptions,
  FindProjectsResult,
  ProjectReader,
} from '../../application/ports/project-reader.port';
import { ProjectLifecycleState } from '../../domain/enums';
import { PrismaProjectMapper } from '../mappers/prisma-project.mapper';

const toPrismaLifecycleState: Record<
  ProjectLifecycleState,
  PrismaProjectLifecycleState
> = {
  [ProjectLifecycleState.NOT_STARTED]: PrismaProjectLifecycleState.NOT_STARTED,
  [ProjectLifecycleState.ACTIVE]: PrismaProjectLifecycleState.ACTIVE,
  [ProjectLifecycleState.PAUSED]: PrismaProjectLifecycleState.PAUSED,
  [ProjectLifecycleState.STOPPED]: PrismaProjectLifecycleState.STOPPED,
  [ProjectLifecycleState.COMPLETED]: PrismaProjectLifecycleState.COMPLETED,
};

@Injectable()
export class PrismaProjectReader implements ProjectReader {
  constructor(private readonly prisma: PrismaService) {}

  public async findAllForOwner(
    ownerId: string,
    options: FindProjectsOptions,
  ): Promise<FindProjectsResult> {
    const search = options.search?.trim();
    const where: Prisma.ProjectWhereInput = {
      ownerId,
      ...(options.state === undefined
        ? {}
        : { lifecycleState: toPrismaLifecycleState[options.state] }),
      ...(search
        ? {
            OR: [
              { title: { contains: search, mode: 'insensitive' } },
              { description: { contains: search, mode: 'insensitive' } },
            ],
          }
        : {}),
    };

    const [rows, total] = await this.prisma.$transaction([
      this.prisma.project.findMany({
        where,
        include: { cycles: { orderBy: { cycleNumber: 'asc' } } },
        orderBy: [{ createdAt: 'desc' }, { id: 'asc' }],
        skip: options.skip,
        take: options.take,
      }),
      this.prisma.project.count({ where }),
    ]);

    return {
      projects: rows.map((row) => PrismaProjectMapper.toDomain(row)),
      total,
    };
  }
}
