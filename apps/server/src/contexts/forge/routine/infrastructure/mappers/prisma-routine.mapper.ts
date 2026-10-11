import {
  ForgeLifecycleAction as PrismaForgeLifecycleAction,
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
  RoutineHabitMembership as PrismaRoutineHabitMembership,
  RoutineLifecycleTransition as PrismaRoutineLifecycleTransition,
} from '@repo/database';

import { RoutineLifecycleAction } from '../../domain/enums';
import {
  RoutineHabitAddedEvent,
  RoutineHabitRemovedEvent,
  RoutineLifecycleTransitionedEvent,
} from '../../domain/events';
import { Routine } from '../../domain/routine.aggregate';
import { RoutineCalendarDate, RoutineId } from '../../domain/value-objects';

// Repository nạp kèm transition mới nhất để aggregate giữ mốc hiệu lực
// không giảm. Reader chỉ phục vụ hiển thị nên không nạp — aggregate khi đó
// không được archive/restore.
export type PrismaRoutineWithHabits = PrismaRoutine & {
  habits: PrismaRoutineHabit[];
  lifecycleTransitions?: Pick<
    PrismaRoutineLifecycleTransition,
    'effectiveOn'
  >[];
  // Toàn bộ lịch sử thành viên của Routine — chỉ cần mốc ngày để dựng mốc
  // sàn theo từng Habit (DAP-FTH-001).
  membershipHistory?: Pick<
    PrismaRoutineHabitMembership,
    'habitId' | 'addedOn' | 'removedOn'
  >[];
};

export interface RoutinePersistence {
  routine: PrismaRoutine;
  habits: PrismaRoutineHabit[];
}

export interface RoutineHabitMembershipOpening {
  routineId: string;
  habitId: string;
  ownerId: string;
  addedOn: Date;
}

export interface RoutineHabitMembershipClosing {
  routineId: string;
  habitId: string;
  ownerId: string;
  removedOn: Date;
}

export interface RoutineLifecycleTransitionPersistence {
  routineId: string;
  ownerId: string;
  action: PrismaForgeLifecycleAction;
  effectiveOn: Date;
  occurredAt: Date;
}

const persistenceLifecycleActions: Record<
  RoutineLifecycleAction,
  PrismaForgeLifecycleAction
> = {
  [RoutineLifecycleAction.ARCHIVED]: PrismaForgeLifecycleAction.ARCHIVED,
  [RoutineLifecycleAction.RESTORED]: PrismaForgeLifecycleAction.RESTORED,
};

export class PrismaRoutineMapper {
  public static toDomain(raw: PrismaRoutineWithHabits): Routine {
    const habitIds = [...raw.habits]
      .sort((left, right) => left.order - right.order)
      .map((membership) => membership.habitId);

    return Routine.rehydrate({
      id: new RoutineId(raw.id),
      ownerId: raw.ownerId,
      title: raw.title,
      habitIds,
      isActive: raw.isActive,
      revision: raw.revision,
      createdAt: raw.createdAt,
      createdOn: RoutineCalendarDate.fromPersistenceDate(raw.createdOn),
      latestLifecycleEffectiveOn: PrismaRoutineMapper.toLifecycleFloor(
        raw.lifecycleTransitions,
      ),
      membershipFloors: PrismaRoutineMapper.toMembershipFloors(
        raw.membershipHistory,
      ),
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(routine: Routine): RoutinePersistence {
    const props = routine.toPrimitives();

    return {
      routine: {
        id: props.id,
        ownerId: props.ownerId,
        title: props.title,
        isActive: props.isActive,
        revision: props.revision,
        createdAt: props.createdAt,
        createdOn: routine.createdOn.toPersistenceDate(),
        updatedAt: props.updatedAt,
      },
      habits: props.habitIds.map((habitId, index) => ({
        routineId: props.id,
        habitId,
        ownerId: props.ownerId,
        order: index + 1,
      })),
    };
  }

  // undefined = caller không nạp lifecycleTransitions (reader); mảng rỗng =
  // đã nạp nhưng Routine chưa có transition nào.
  private static toLifecycleFloor(
    transitions: PrismaRoutineWithHabits['lifecycleTransitions'],
  ): RoutineCalendarDate | null | undefined {
    if (transitions === undefined) {
      return undefined;
    }

    const [latest] = transitions;

    return latest
      ? RoutineCalendarDate.fromPersistenceDate(latest.effectiveOn)
      : null;
  }

  // undefined = caller không nạp membershipHistory (reader). Mốc sàn của 1
  // Habit = ngày muộn nhất trong mọi addedOn/removedOn của cặp đó.
  private static toMembershipFloors(
    history: PrismaRoutineWithHabits['membershipHistory'],
  ): Map<string, RoutineCalendarDate> | undefined {
    if (history === undefined) {
      return undefined;
    }

    const floors = new Map<string, RoutineCalendarDate>();

    for (const row of history) {
      for (const date of [row.addedOn, row.removedOn]) {
        if (date === null) {
          continue;
        }

        floors.set(
          row.habitId,
          RoutineCalendarDate.latest(
            RoutineCalendarDate.fromPersistenceDate(date),
            floors.get(row.habitId) ?? null,
          ),
        );
      }
    }

    return floors;
  }

  public static membershipOpeningToPersistence(
    event: RoutineHabitAddedEvent,
  ): RoutineHabitMembershipOpening {
    return {
      routineId: event.routineId,
      habitId: event.habitId,
      ownerId: event.ownerId,
      addedOn: event.addedOn.toPersistenceDate(),
    };
  }

  public static membershipClosingToPersistence(
    event: RoutineHabitRemovedEvent,
  ): RoutineHabitMembershipClosing {
    return {
      routineId: event.routineId,
      habitId: event.habitId,
      ownerId: event.ownerId,
      removedOn: event.removedOn.toPersistenceDate(),
    };
  }

  public static transitionToPersistence(
    event: RoutineLifecycleTransitionedEvent,
  ): RoutineLifecycleTransitionPersistence {
    return {
      routineId: event.routineId,
      ownerId: event.ownerId,
      action: persistenceLifecycleActions[event.action],
      effectiveOn: event.effectiveOn.toPersistenceDate(),
      occurredAt: event.occurredOn,
    };
  }
}
