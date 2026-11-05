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
  FocusCandidate,
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
        include: PrismaProjectMapper.include,
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

  public async findFocusCandidates(ownerId: string): Promise<FocusCandidate[]> {
    const rows = await this.prisma.project.findMany({
      where: {
        ownerId,
        lifecycleState: PrismaProjectLifecycleState.ACTIVE,
        cycles: { some: { endedAt: null } },
      },
      include: PrismaProjectMapper.include,
    });

    if (rows.length === 0) return [];

    const sources = await this.prisma.projectActivitySource.findMany({
      where: { ownerId, projectId: { in: rows.map((row) => row.id) } },
      select: {
        projectId: true,
        feed: {
          select: {
            events: {
              orderBy: { occurredAt: 'desc' },
              take: 1,
              select: { occurredAt: true },
            },
          },
        },
      },
    });

    const latest = new Map<string, Date>();
    for (const source of sources) {
      const at = source.feed.events[0]?.occurredAt;
      const known = latest.get(source.projectId);
      if (at && (!known || at > known)) latest.set(source.projectId, at);
    }

    return rows.map((row) => ({
      project: PrismaProjectMapper.toDomain(row),
      lastActivityAt: latest.get(row.id) ?? null,
    }));
  }
}
