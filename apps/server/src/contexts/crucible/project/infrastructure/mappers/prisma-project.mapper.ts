import {
  Project as PrismaProject,
  ProjectCycle as PrismaProjectCycle,
  ProjectCycleEndReason as PrismaProjectCycleEndReason,
  ProjectLifecycleAction as PrismaProjectLifecycleAction,
  ProjectLifecycleState as PrismaProjectLifecycleState,
} from '@repo/database';

import { ProjectCycle } from '../../domain/project-cycle.entity';
import {
  ProjectCycleEndReason,
  ProjectLifecycleAction,
  ProjectLifecycleState,
} from '../../domain/enums';
import { ProjectLifecycleTransitionedEvent } from '../../domain/events';
import { Project } from '../../domain/project.aggregate';
import {
  IntendedOutcome,
  ProjectCycleId,
  ProjectId,
} from '../../domain/value-objects';

export type PrismaProjectWithCycles = PrismaProject & {
  cycles: PrismaProjectCycle[];
};

export interface ProjectCyclePersistence {
  id: string;
  projectId: string;
  ownerId: string;
  cycleNumber: number;
  intendedOutcome: string | null;
  startedAt: Date;
  endedAt: Date | null;
  endReason: PrismaProjectCycleEndReason | null;
}

export interface ProjectLifecycleTransitionPersistence {
  projectId: string;
  cycleId: string | null;
  action: PrismaProjectLifecycleAction;
  fromState: PrismaProjectLifecycleState;
  toState: PrismaProjectLifecycleState;
  occurredAt: Date;
}

export interface ProjectPersistence {
  project: PrismaProject;
  cycles: ProjectCyclePersistence[];
}

const toPrismaAction: Record<
  ProjectLifecycleAction,
  PrismaProjectLifecycleAction
> = {
  [ProjectLifecycleAction.START]: PrismaProjectLifecycleAction.START,
  [ProjectLifecycleAction.PAUSE]: PrismaProjectLifecycleAction.PAUSE,
  [ProjectLifecycleAction.RESUME]: PrismaProjectLifecycleAction.RESUME,
  [ProjectLifecycleAction.STOP]: PrismaProjectLifecycleAction.STOP,
  [ProjectLifecycleAction.COMPLETE]: PrismaProjectLifecycleAction.COMPLETE,
  [ProjectLifecycleAction.REOPEN]: PrismaProjectLifecycleAction.REOPEN,
};

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

const toDomainLifecycleState: Record<
  PrismaProjectLifecycleState,
  ProjectLifecycleState
> = {
  [PrismaProjectLifecycleState.NOT_STARTED]: ProjectLifecycleState.NOT_STARTED,
  [PrismaProjectLifecycleState.ACTIVE]: ProjectLifecycleState.ACTIVE,
  [PrismaProjectLifecycleState.PAUSED]: ProjectLifecycleState.PAUSED,
  [PrismaProjectLifecycleState.STOPPED]: ProjectLifecycleState.STOPPED,
  [PrismaProjectLifecycleState.COMPLETED]: ProjectLifecycleState.COMPLETED,
};

const toPrismaEndReason: Record<
  ProjectCycleEndReason,
  PrismaProjectCycleEndReason
> = {
  [ProjectCycleEndReason.STOPPED]: PrismaProjectCycleEndReason.STOPPED,
  [ProjectCycleEndReason.COMPLETED]: PrismaProjectCycleEndReason.COMPLETED,
};

const toDomainEndReason: Record<
  PrismaProjectCycleEndReason,
  ProjectCycleEndReason
> = {
  [PrismaProjectCycleEndReason.STOPPED]: ProjectCycleEndReason.STOPPED,
  [PrismaProjectCycleEndReason.COMPLETED]: ProjectCycleEndReason.COMPLETED,
};

export class PrismaProjectMapper {
  public static toDomain(raw: PrismaProjectWithCycles): Project {
    const cycles = [...raw.cycles]
      .sort((left, right) => left.cycleNumber - right.cycleNumber)
      .map((cycle) => PrismaProjectMapper.cycleToDomain(cycle));

    return Project.rehydrate({
      id: new ProjectId(raw.id),
      ownerId: raw.ownerId,
      title: raw.title,
      description: raw.description,
      lifecycleState: toDomainLifecycleState[raw.lifecycleState],
      revision: raw.revision,
      cycles,
      createdAt: raw.createdAt,
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(project: Project): ProjectPersistence {
    const props = project.toPrimitives();

    return {
      project: {
        id: props.id,
        ownerId: props.ownerId,
        title: props.title,
        description: props.description,
        lifecycleState: toPrismaLifecycleState[props.lifecycleState],
        revision: props.revision,
        createdAt: props.createdAt,
        updatedAt: props.updatedAt,
      },
      cycles: project.cycles.map((cycle) =>
        PrismaProjectMapper.cycleToPersistence(props.id, props.ownerId, cycle),
      ),
    };
  }

  private static cycleToDomain(raw: PrismaProjectCycle): ProjectCycle {
    return ProjectCycle.rehydrate({
      id: new ProjectCycleId(raw.id),
      cycleNumber: raw.cycleNumber,
      intendedOutcome: raw.intendedOutcome
        ? IntendedOutcome.create(raw.intendedOutcome)
        : null,
      startedAt: raw.startedAt,
      endedAt: raw.endedAt,
      endReason: raw.endReason ? toDomainEndReason[raw.endReason] : null,
    });
  }

  private static cycleToPersistence(
    projectId: string,
    ownerId: string,
    cycle: ProjectCycle,
  ): ProjectCyclePersistence {
    const primitives = cycle.toPrimitives();

    return {
      id: primitives.id,
      projectId,
      ownerId,
      cycleNumber: primitives.cycleNumber,
      intendedOutcome: primitives.intendedOutcome,
      startedAt: primitives.startedAt,
      endedAt: primitives.endedAt,
      endReason: primitives.endReason
        ? toPrismaEndReason[primitives.endReason]
        : null,
    };
  }

  public static transitionToPersistence(
    event: ProjectLifecycleTransitionedEvent,
  ): ProjectLifecycleTransitionPersistence {
    return {
      projectId: event.projectId,
      cycleId: event.cycleId,
      action: toPrismaAction[event.action],
      fromState: toPrismaLifecycleState[event.fromState],
      toState: toPrismaLifecycleState[event.toState],
      occurredAt: event.occurredOn,
    };
  }
}
