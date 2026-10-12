import {
  Project as PrismaProject,
  ProjectCycle as PrismaProjectCycle,
  ProjectCycleEndReason as PrismaProjectCycleEndReason,
  ProjectCycleOutcomeEntry as PrismaProjectCycleOutcomeEntry,
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
  ClosingNote,
  IntendedOutcome,
  IntendedOutcomeEntry,
  ProjectCycleId,
  ProjectId,
} from '../../domain/value-objects';

export type PrismaProjectCycleWithEntries = PrismaProjectCycle & {
  outcomeEntries: PrismaProjectCycleOutcomeEntry[];
};

export type PrismaProjectWithCycles = PrismaProject & {
  cycles: PrismaProjectCycleWithEntries[];
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
  closingNote: string | null;
  targetEndAt: Date | null;
}

export interface ProjectCycleOutcomeEntryPersistence {
  cycleId: string;
  sequence: number;
  outcome: string;
  setAt: Date;
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
  outcomeEntries: ProjectCycleOutcomeEntryPersistence[];
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

/** @db.Date về từ Prisma là 00:00 UTC — lấy phần ngày, không đổi múi giờ. */
const dateOnlyToString = (date: Date): string =>
  date.toISOString().slice(0, 10);

const dateOnlyFromString = (day: string): Date =>
  new Date(`${day}T00:00:00.000Z`);

export class PrismaProjectMapper {
  /** Dùng chung cho repository và reader: Cycle + lịch sử, đều có thứ tự. */
  public static readonly include = {
    cycles: {
      orderBy: { cycleNumber: 'asc' as const },
      include: { outcomeEntries: { orderBy: { sequence: 'asc' as const } } },
    },
  };

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
      outcomeEntries: project.cycles.flatMap((cycle) =>
        cycle.outcomeHistory.map((entry) => ({
          cycleId: cycle.id,
          sequence: entry.sequence,
          outcome: entry.outcome,
          setAt: entry.setAt,
        })),
      ),
    };
  }

  private static cycleToDomain(
    raw: PrismaProjectCycleWithEntries,
  ): ProjectCycle {
    return ProjectCycle.rehydrate({
      id: new ProjectCycleId(raw.id),
      cycleNumber: raw.cycleNumber,
      outcomeHistory: PrismaProjectMapper.outcomeHistoryToDomain(raw),
      startedAt: raw.startedAt,
      endedAt: raw.endedAt,
      endReason: raw.endReason ? toDomainEndReason[raw.endReason] : null,
      closingNote: raw.closingNote
        ? ClosingNote.rehydrate(raw.closingNote)
        : null,
      targetEndAt: raw.targetEndAt ? dateOnlyToString(raw.targetEndAt) : null,
    });
  }

  private static outcomeHistoryToDomain(
    raw: PrismaProjectCycleWithEntries,
  ): IntendedOutcomeEntry[] {
    if (raw.outcomeEntries.length > 0) {
      return raw.outcomeEntries.map((entry) =>
        IntendedOutcomeEntry.create(
          entry.sequence,
          IntendedOutcome.create(entry.outcome),
          entry.setAt,
        ),
      );
    }
    // Server bản cũ còn chạy trong lúc deploy chỉ ghi cột intended_outcome.
    // Coi nó là entry 1 để không mất outcome đó. Bỏ cùng lúc drop cột.
    return raw.intendedOutcome
      ? [
          IntendedOutcomeEntry.create(
            1,
            IntendedOutcome.create(raw.intendedOutcome),
            raw.updatedAt,
          ),
        ]
      : [];
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
      // Ghi đôi: entry mới nhất, để server cũ (hoặc rollback) đọc đúng.
      intendedOutcome: primitives.intendedOutcome,
      startedAt: primitives.startedAt,
      endedAt: primitives.endedAt,
      endReason: primitives.endReason
        ? toPrismaEndReason[primitives.endReason]
        : null,
      closingNote: primitives.closingNote,
      targetEndAt: primitives.targetEndAt
        ? dateOnlyFromString(primitives.targetEndAt)
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
