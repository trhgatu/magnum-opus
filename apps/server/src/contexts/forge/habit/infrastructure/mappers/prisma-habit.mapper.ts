import {
  ForgeLifecycleAction as PrismaForgeLifecycleAction,
  Habit as PrismaHabit,
  HabitFrequencyType as PrismaHabitFrequencyType,
  HabitLifecycleTransition as PrismaHabitLifecycleTransition,
  HabitScheduleVersion as PrismaHabitScheduleVersion,
  HabitType as PrismaHabitType,
} from '@repo/database';

import {
  HabitFrequencyType,
  HabitLifecycleAction,
  HabitType,
} from '../../domain/enums';
import {
  HabitLifecycleTransitionedEvent,
  HabitScheduleVersionStartedEvent,
} from '../../domain/events';
import { Habit } from '../../domain/habit.aggregate';
import {
  HabitCalendarDate,
  HabitFrequency,
  HabitId,
} from '../../domain/value-objects';

// Repository nạp kèm transition mới nhất và phiên bản tần suất đang mở để
// aggregate giữ mốc hiệu lực không giảm. Reader chỉ phục vụ hiển thị nên không
// nạp — aggregate khi đó không được archive/restore hay đổi tần suất.
export type PrismaHabitWithLatestTransition = PrismaHabit & {
  lifecycleTransitions?: Pick<PrismaHabitLifecycleTransition, 'effectiveOn'>[];
  scheduleVersions?: Pick<PrismaHabitScheduleVersion, 'effectiveFrom'>[];
};

export interface HabitLifecycleTransitionPersistence {
  habitId: string;
  ownerId: string;
  action: PrismaForgeLifecycleAction;
  effectiveOn: Date;
  occurredAt: Date;
}

export interface HabitScheduleVersionPersistence {
  habitId: string;
  ownerId: string;
  frequencyType: PrismaHabitFrequencyType;
  frequencyDays: number[];
  effectiveFrom: Date;
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
      openScheduleEffectiveFrom: PrismaHabitMapper.toScheduleFloor(
        raw.scheduleVersions,
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

  // undefined = caller không nạp scheduleVersions (reader); mảng rỗng = đã nạp
  // nhưng không có phiên bản đang mở (Habit QUIT).
  private static toScheduleFloor(
    versions: PrismaHabitWithLatestTransition['scheduleVersions'],
  ): HabitCalendarDate | null | undefined {
    if (versions === undefined) {
      return undefined;
    }

    const [open] = versions;

    return open
      ? HabitCalendarDate.fromPersistenceDate(open.effectiveFrom)
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

  public static scheduleVersionToPersistence(
    event: HabitScheduleVersionStartedEvent,
  ): HabitScheduleVersionPersistence {
    return {
      habitId: event.habitId,
      ownerId: event.ownerId,
      frequencyType: persistenceFrequencyTypes[event.frequency.type],
      frequencyDays: event.frequency.days,
      effectiveFrom: event.effectiveFrom.toPersistenceDate(),
    };
  }
}
