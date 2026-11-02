import {
  type HabitScheduleHistory,
  isAliveOn,
  isDueOn,
} from '@shared/domain/habit-schedule';

import { CalendarDay, daysBetween, eachDay } from '../../domain/calendar-day';
import { HabitSectionData } from '../section-data';

// Quy tắc lịch nằm ở shared (Forge dùng chung); giữ export ở đây cho các nơi
// trong Chronicle đang import từ file này.
export {
  type HabitLifecycleEntry,
  type HabitScheduleEntry,
  isAliveOn,
  isDueOn,
} from '@shared/domain/habit-schedule';

const MIN_DUE_DAYS_FOR_CONSISTENCY = 7;

export interface HabitHistory extends HabitScheduleHistory {
  id: string;
  title: string;
  checkInDays: ReadonlySet<CalendarDay>;
  quitStartedOn: CalendarDay | null;
  relapseDays: CalendarDay[];
}

export function summarizeHabits(
  habits: HabitHistory[],
  range: { from: CalendarDay; to: CalendarDay },
): HabitSectionData {
  const days = eachDay(range.from, range.to);

  let totalDue = 0;
  let totalDone = 0;
  let bestStreak: HabitSectionData['bestStreak'] = null;
  let mostConsistentHabit: HabitSectionData['mostConsistentHabit'] = null;
  const quitHabits: HabitSectionData['quitHabits'] = [];

  for (const habit of habits) {
    if (habit.type === 'QUIT') {
      const quit = summarizeQuitHabit(habit, days);

      if (quit) {
        quitHabits.push(quit);
      }
      continue;
    }
    let due = 0;
    let done = 0;
    let streak = 0;
    let longestStreak = 0;

    for (const day of days) {
      if (!isDueOn(habit, day)) {
        continue;
      }

      due += 1;

      if (habit.checkInDays.has(day)) {
        done += 1;
        streak += 1;
        longestStreak = Math.max(longestStreak, streak);
      } else {
        streak = 0;
      }
    }
    totalDue += due;
    totalDone += done;

    if (longestStreak > (bestStreak?.days ?? 0)) {
      bestStreak = { habitTitle: habit.title, days: longestStreak };
    }

    if (due >= MIN_DUE_DAYS_FOR_CONSISTENCY) {
      const completionRate = done / due;

      if (
        mostConsistentHabit === null ||
        completionRate > mostConsistentHabit.completionRate
      ) {
        mostConsistentHabit = { habitTitle: habit.title, completionRate };
      }
    }
  }

  return {
    buildCompletionRate: totalDue === 0 ? 0 : totalDone / totalDue,
    bestStreak,
    mostConsistentHabit,
    quitHabits,
  };
}

function summarizeQuitHabit(
  habit: HabitHistory,
  days: CalendarDay[],
): HabitSectionData['quitHabits'][number] | null {
  const referenceDay = [...days].reverse().find((day) => isAliveOn(habit, day));

  if (
    referenceDay === undefined ||
    habit.quitStartedOn === null ||
    habit.quitStartedOn > referenceDay
  ) {
    return null;
  }

  const lastRelapse = habit.relapseDays
    .filter((day) => day <= referenceDay)
    .at(-1);

  return {
    habitTitle: habit.title,
    daysSinceLastRelapse: daysBetween(
      lastRelapse ?? habit.quitStartedOn,
      referenceDay,
    ),
  };
}
