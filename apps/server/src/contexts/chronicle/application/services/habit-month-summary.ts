import {
  CalendarDay,
  daysBetween,
  eachDay,
  isoWeekday,
} from '../../domain/calendar-day';
import { HabitSectionData } from '../section-data';

const MIN_DUE_DAYS_FOR_CONSISTENCY = 7;

export interface HabitLifecycleEntry {
  action: 'ARCHIVED' | 'RESTORED';
  effectiveOn: CalendarDay;
}

export interface HabitScheduleEntry {
  frequencyType: 'DAILY' | 'WEEKLY';
  frequencyDays: number[];
  effectiveFrom: CalendarDay;
  effectiveTo: CalendarDay | null;
}

export interface HabitHistory {
  id: string;
  title: string;
  type: 'BUILD' | 'QUIT';
  createdOn: CalendarDay;
  lifecycle: HabitLifecycleEntry[];
  schedules: HabitScheduleEntry[];
  checkInDays: ReadonlySet<CalendarDay>;
  quitStartedOn: CalendarDay | null;
  relapseDays: CalendarDay[];
}

// Dùng chung cho Habit và Routine — cùng quy tắc lifecycle (temporal-history
// 02 §4.1–4.2), nên chỉ cần createdOn và lifecycle.
export function isAliveOn(
  subject: Pick<HabitHistory, 'createdOn' | 'lifecycle'>,
  day: CalendarDay,
): boolean {
  if (day < subject.createdOn) {
    return false;
  }
  let alive = true;

  for (const entry of subject.lifecycle) {
    if (entry.effectiveOn > day) {
      break;
    }

    alive = entry.action === 'RESTORED';
  }
  return alive;
}

export function isDueOn(habit: HabitHistory, day: CalendarDay): boolean {
  if (habit.type !== 'BUILD' || !isAliveOn(habit, day)) {
    return false;
  }

  const schedule = habit.schedules.find(
    (version) =>
      version.effectiveFrom <= day &&
      (version.effectiveTo === null || day < version.effectiveTo),
  );

  if (!schedule) {
    return false;
  }

  return (
    schedule.frequencyType === 'DAILY' ||
    schedule.frequencyDays.includes(isoWeekday(day))
  );
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
