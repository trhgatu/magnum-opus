import type { ProjectResponse } from '@repo/contracts';

import { Project } from '../../domain/project.aggregate';

export class ProjectPresenter {
  public static toResponse(project: Project): ProjectResponse {
    const currentCycle = project.currentCycle;

    return {
      id: project.id,
      title: project.title,
      description: project.description,
      lifecycleState: project.lifecycleState,
      currentCycle: currentCycle
        ? {
            id: currentCycle.id,
            cycleNumber: currentCycle.cycleNumber,
            intendedOutcome: currentCycle.intendedOutcome,
            startedAt: currentCycle.startedAt.toISOString(),
            endedAt: currentCycle.endedAt
              ? currentCycle.endedAt.toISOString()
              : null,
            endReason: currentCycle.endReason,
          }
        : null,
      revision: project.revision,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
}
