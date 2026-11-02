import type {
  HabitOverviewResponse,
  HabitOverviewItemResponse,
  HabitOverviewItemEnvelope,
} from '@repo/contracts';

import type { HabitOverviewItemResult } from '../../application/queries/handlers/get-habit-overview-item.handler';

import type {
  HabitOverviewItem,
  HabitOverviewResult,
} from '../../application/queries/handlers/get-habit-overview.handler';

export class HabitOverviewPresenter {
  public static toResponse(result: HabitOverviewResult): HabitOverviewResponse {
    return {
      date: result.date,
      timeZone: result.timeZone,
      habits: result.items.map((item) => HabitOverviewPresenter.toItem(item)),
    };
  }

  public static toItemEnvelope(
    result: HabitOverviewItemResult,
  ): HabitOverviewItemEnvelope {
    return {
      date: result.date,
      timeZone: result.timeZone,
      habit: HabitOverviewPresenter.toItem(result.item),
    };
  }

  public static toItem({
    habit,
    overview,
    checkedInAt,
  }: HabitOverviewItem): HabitOverviewItemResponse {
    return {
      id: habit.id,
      title: habit.title,
      description: habit.description,
      type: habit.type,
      frequencyType: habit.frequencyType,
      frequencyDays: habit.frequencyDays,
      quitStartedAt: habit.quitStartedOn,
      routines: habit.routines,
      dueToday: overview.dueToday,
      checkedInToday: overview.checkedInToday,
      checkedInAt: checkedInAt?.toISOString() ?? null,
      currentStreak: overview.currentStreak,
      longestStreak: overview.longestStreak,
      lastSevenDays: overview.lastSevenDays,
      nextDueOn: overview.nextDueOn,
    };
  }
}
