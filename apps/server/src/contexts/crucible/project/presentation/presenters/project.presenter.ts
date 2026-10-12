import type { ProjectCycleResponse, ProjectResponse } from '@repo/contracts';
import { ProjectCycle } from '../../domain/project-cycle.entity';
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
        ? ProjectPresenter.cycleToResponse(currentCycle)
        : null,
      revision: project.revision,
      createdAt: project.createdAt.toISOString(),
      updatedAt: project.updatedAt.toISOString(),
    };
  }
  /** FR-PRJ-017: chỉ Cycle đã đóng, mới nhất trước (cycleNumber giảm dần). */
  public static toClosedCycles(project: Project): ProjectCycleResponse[] {
    return project.cycles
      .filter((cycle) => !cycle.isOpen)
      .sort((left, right) => right.cycleNumber - left.cycleNumber)
      .map((cycle) => ProjectPresenter.cycleToResponse(cycle));
  }

  private static cycleToResponse(cycle: ProjectCycle): ProjectCycleResponse {
    return {
      id: cycle.id,
      cycleNumber: cycle.cycleNumber,
      intendedOutcome: cycle.intendedOutcome,
      outcomeHistory: cycle.outcomeHistory.map((entry) => ({
        outcome: entry.outcome,
        setAt: entry.setAt.toISOString(),
      })),
      targetEndAt: cycle.targetEndAt,
      closingNote: cycle.closingNote,
      startedAt: cycle.startedAt.toISOString(),
      endedAt: cycle.endedAt ? cycle.endedAt.toISOString() : null,
      endReason: cycle.endReason,
    };
  }
}
