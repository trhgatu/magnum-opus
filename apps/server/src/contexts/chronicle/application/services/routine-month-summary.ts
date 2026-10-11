import { CalendarDay, eachDay } from '../../domain/calendar-day';
import { RoutineSectionData } from '../section-data';
import {
  HabitHistory,
  HabitLifecycleEntry,
  isAliveOn,
  isDueOn,
} from './habit-month-summary';

/** 1 khoảng [addedOn, removedOn) mà Habit nằm trong Routine (temporal-history 02 §3.4). */
export interface RoutineMembershipEntry {
  habit: HabitHistory;
  addedOn: CalendarDay;
  removedOn: CalendarDay | null;
}

export interface RoutineHistory {
  createdOn: CalendarDay;
  /** Đã sắp theo effectiveOn rồi occurredAt, cũ trước. */
  lifecycle: HabitLifecycleEntry[];
  memberships: RoutineMembershipEntry[];
}

/** temporal-history 02 §4.5. */
function isMemberOn(entry: RoutineMembershipEntry, day: CalendarDay): boolean {
  return (
    entry.addedOn <= day && (entry.removedOn === null || day < entry.removedOn)
  );
}

/**
 * Tỷ lệ hoàn thành Routine của 1 kỳ (Chronicle 02 §5). 1 buổi = 1 ngày
 * Routine sống và có ≥ 1 Habit thành viên đến hạn; buổi hoàn thành khi mọi
 * Habit đó đều check-in (tất cả hoặc không).
 */
export function summarizeRoutines(
  routines: RoutineHistory[],
  range: { from: CalendarDay; to: CalendarDay },
): RoutineSectionData {
  const days = eachDay(range.from, range.to);

  let sessions = 0;
  let completedSessions = 0;

  for (const routine of routines) {
    for (const day of days) {
      if (!isAliveOn(routine, day)) {
        continue;
      }

      const dueHabits = routine.memberships
        .filter((entry) => isMemberOn(entry, day) && isDueOn(entry.habit, day))
        .map((entry) => entry.habit);

      if (dueHabits.length === 0) {
        continue;
      }

      sessions += 1;

      if (dueHabits.every((habit) => habit.checkInDays.has(day))) {
        completedSessions += 1;
      }
    }
  }

  return {
    completionRate: sessions === 0 ? 0 : completedSessions / sessions,
  };
}
