import {
  ForgeLifecycleAction as PrismaForgeLifecycleAction,
  Routine as PrismaRoutine,
  RoutineHabit as PrismaRoutineHabit,
  RoutineLifecycleTransition as PrismaRoutineLifecycleTransition,
} from '@repo/database';

import { RoutineLifecycleAction } from '../../domain/enums';
import { RoutineLifecycleTransitionedEvent } from '../../domain/events';
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
};

export interface RoutinePersistence {
  routine: PrismaRoutine;
  habits: PrismaRoutineHabit[];
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
