import {
  ForgeLifecycleAction as PrismaForgeLifecycleAction,
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
  HabitLifecycleTransition as PrismaHabitLifecycleTransition,
  HabitType as PrismaHabitType,
} from '@repo/database';

import {
  HabitFrequencyType,
  HabitLifecycleAction,
  HabitType,
} from '../../domain/enums';
import { HabitLifecycleTransitionedEvent } from '../../domain/events';
import { Habit } from '../../domain/habit.aggregate';
import {
  HabitCalendarDate,
  HabitFrequency,
  HabitId,
} from '../../domain/value-objects';

// Repository nạp kèm transition mới nhất để aggregate giữ mốc hiệu lực
// không giảm. Reader chỉ phục vụ hiển thị nên không nạp — aggregate khi đó
// không được archive/restore.
export type PrismaHabitWithLatestTransition = PrismaHabit & {
  lifecycleTransitions?: Pick<PrismaHabitLifecycleTransition, 'effectiveOn'>[];
};

export interface HabitLifecycleTransitionPersistence {
  habitId: string;
  ownerId: string;
  action: PrismaForgeLifecycleAction;
  effectiveOn: Date;
  occurredAt: Date;
}

const domainFrequencyTypes: Record<
  PrismaHabitFrequencyType,
  HabitFrequencyType
> = {
  [PrismaHabitFrequencyType.DAILY]: HabitFrequencyType.DAILY,
  [PrismaHabitFrequencyType.WEEKLY]: HabitFrequencyType.WEEKLY,
};

const persistenceFrequencyTypes: Record<
  HabitFrequencyType,
  PrismaHabitFrequencyType
> = {
  [HabitFrequencyType.DAILY]: PrismaHabitFrequencyType.DAILY,
  [HabitFrequencyType.WEEKLY]: PrismaHabitFrequencyType.WEEKLY,
};

const domainHabitTypes: Record<PrismaHabitType, HabitType> = {
  [PrismaHabitType.BUILD]: HabitType.BUILD,
  [PrismaHabitType.QUIT]: HabitType.QUIT,
};

const persistenceHabitTypes: Record<HabitType, PrismaHabitType> = {
  [HabitType.BUILD]: PrismaHabitType.BUILD,
  [HabitType.QUIT]: PrismaHabitType.QUIT,
};

const persistenceLifecycleActions: Record<
  HabitLifecycleAction,
  PrismaForgeLifecycleAction
> = {
  [HabitLifecycleAction.ARCHIVED]: PrismaForgeLifecycleAction.ARCHIVED,
  [HabitLifecycleAction.RESTORED]: PrismaForgeLifecycleAction.RESTORED,
};

export class PrismaHabitMapper {
  public static toDomain(raw: PrismaHabitWithLatestTransition): Habit {
    return Habit.rehydrate({
      id: new HabitId(raw.id),
      ownerId: raw.ownerId,
      title: raw.title,
      description: raw.description,
      type: domainHabitTypes[raw.type],
      frequency:
        raw.frequencyType === null
          ? null
          : HabitFrequency.rehydrate(
              domainFrequencyTypes[raw.frequencyType],
              raw.frequencyDays,
            ),
      quitStartedAt: raw.quitStartedAt,
      isActive: raw.isActive,
      revision: raw.revision,
      createdAt: raw.createdAt,
      createdOn: HabitCalendarDate.fromPersistenceDate(raw.createdOn),
      latestLifecycleEffectiveOn: PrismaHabitMapper.toLifecycleFloor(
        raw.lifecycleTransitions,
      ),
      updatedAt: raw.updatedAt,
    });
  }

  public static toPersistence(habit: Habit): PrismaHabit {
    const props = habit.toPrimitives();

    return {
      id: props.id,
      ownerId: props.ownerId,
      title: props.title,
      description: props.description,
      type: persistenceHabitTypes[props.type],
      frequencyType:
        props.frequencyType === null
          ? null
          : persistenceFrequencyTypes[props.frequencyType],
      frequencyDays: props.frequencyDays,
      quitStartedAt: props.quitStartedAt,
      isActive: props.isActive,
      revision: props.revision,
      createdAt: props.createdAt,
      createdOn: habit.createdOn.toPersistenceDate(),
      updatedAt: props.updatedAt,
    };
  }

  // undefined = caller không nạp lifecycleTransitions (reader); mảng rỗng =
  // đã nạp nhưng Habit chưa có transition nào.
  private static toLifecycleFloor(
    transitions: PrismaHabitWithLatestTransition['lifecycleTransitions'],
  ): HabitCalendarDate | null | undefined {
    if (transitions === undefined) {
      return undefined;
    }

    const [latest] = transitions;

    return latest
      ? HabitCalendarDate.fromPersistenceDate(latest.effectiveOn)
      : null;
  }

  public static transitionToPersistence(
    event: HabitLifecycleTransitionedEvent,
  ): HabitLifecycleTransitionPersistence {
    return {
      habitId: event.habitId,
      ownerId: event.ownerId,
      action: persistenceLifecycleActions[event.action],
      effectiveOn: event.effectiveOn.toPersistenceDate(),
      occurredAt: event.occurredOn,
    };
  }
}
