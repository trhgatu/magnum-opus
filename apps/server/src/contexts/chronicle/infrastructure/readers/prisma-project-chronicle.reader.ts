import { Injectable } from '@nestjs/common';

import { ProjectLifecycleState } from '@repo/database';

import { PrismaService } from '@infrastructure/database/prisma.service';

import { ChronicleSectionReader } from '../../application/ports';
import { ProjectSectionData } from '../../application/section-data';
import { ChroniclePeriod } from '../../domain/value-objects';

@Injectable()
export class PrismaProjectChronicleReader implements ChronicleSectionReader<'project'> {
  public readonly module = 'project' as const;
  public readonly schemaVersion = 1;
  public readonly historyOnly = true;

  constructor(private readonly prisma: PrismaService) {}

  public async getSummary(
    ownerId: string,
    period: ChroniclePeriod,
  ): Promise<ProjectSectionData> {
    const transitions = await this.prisma.projectLifecycleTransition.findMany({
      where: {
        project: { ownerId },
        occurredAt: { lt: period.end },
      },
      select: { projectId: true, toState: true, occurredAt: true },
      orderBy: [{ occurredAt: 'asc' }, { createdAt: 'asc' }],
    });

    const stateAtStart = new Map<string, ProjectLifecycleState>();
    const activeProjects = new Set<string>();
    const completedProjects = new Set<string>();
    const stoppedProjects = new Set<string>();

    for (const transition of transitions) {
      if (transition.occurredAt < period.start) {
        stateAtStart.set(transition.projectId, transition.toState);
        continue;
      }

      if (transition.toState === ProjectLifecycleState.ACTIVE) {
        activeProjects.add(transition.projectId);
      }

      if (transition.toState === ProjectLifecycleState.COMPLETED) {
        completedProjects.add(transition.projectId);
      }

      if (transition.toState === ProjectLifecycleState.STOPPED) {
        stoppedProjects.add(transition.projectId);
      }
    }

    for (const [projectId, state] of stateAtStart) {
      if (state === ProjectLifecycleState.ACTIVE) {
        activeProjects.add(projectId);
      }
    }

    return {
      activeCount: activeProjects.size,
      completedCount: completedProjects.size,
      stoppedCount: stoppedProjects.size,
    };
  }
}
