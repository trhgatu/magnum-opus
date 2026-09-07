import { Injectable } from '@nestjs/common';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { Project } from '../../domain/project.aggregate';
import { ProjectRepository } from '../../domain/ports/project.repository';
import { PrismaProjectMapper } from '../mappers/prisma-project.mapper';
import { ProjectLifecycleTransitionedEvent } from '../../domain/events';

@Injectable()
export class PrismaProjectRepository implements ProjectRepository {
  constructor(private readonly prisma: PrismaService) {}

  public async create(project: Project): Promise<void> {
    const raw = PrismaProjectMapper.toPersistence(project);

    await this.prisma.project.create({
      data: raw.project,
    });
  }

  public async update(
    project: Project,
    expectedRevision: number,
  ): Promise<boolean> {
    const raw = PrismaProjectMapper.toPersistence(project);
    const transitions = project
      .pullDomainEvents()
      .filter(
        (event): event is ProjectLifecycleTransitionedEvent =>
          event instanceof ProjectLifecycleTransitionedEvent,
      )
      .map((event) => PrismaProjectMapper.transitionToPersistence(event));

    return this.prisma.$transaction(async (transaction) => {
      const result = await transaction.project.updateMany({
        where: {
          id: raw.project.id,
          ownerId: raw.project.ownerId,
          revision: expectedRevision,
        },
        data: {
          title: raw.project.title,
          description: raw.project.description,
          lifecycleState: raw.project.lifecycleState,
          revision: raw.project.revision,
          updatedAt: raw.project.updatedAt,
        },
      });

      if (result.count !== 1) {
        return false;
      }

      for (const cycle of raw.cycles) {
        await transaction.projectCycle.upsert({
          where: { id: cycle.id },
          create: cycle,
          update: {
            intendedOutcome: cycle.intendedOutcome,
            endedAt: cycle.endedAt,
            endReason: cycle.endReason,
          },
        });
      }

      if (transitions.length > 0) {
        await transaction.projectLifecycleTransition.createMany({
          data: transitions,
        });
      }

      return true;
    });
  }

  public async findByIdForOwner(
    id: string,
    ownerId: string,
  ): Promise<Project | null> {
    const raw = await this.prisma.project.findFirst({
      where: { id, ownerId },
      include: {
        cycles: {
          orderBy: { cycleNumber: 'asc' },
        },
      },
    });

    return raw ? PrismaProjectMapper.toDomain(raw) : null;
  }

  public async deletePermanently(
    id: string,
    ownerId: string,
    expectedRevision: number,
  ): Promise<boolean> {
    const result = await this.prisma.project.deleteMany({
      where: { id, ownerId, revision: expectedRevision },
    });

    return result.count === 1;
  }
}
