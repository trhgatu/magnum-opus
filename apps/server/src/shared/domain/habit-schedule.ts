import { type CalendarDay, isoWeekday } from './calendar-day';

/**
 * Quy tắc "Habit có sống / có lịch vào ngày D" theo lịch sử (temporal-history
 * 02 §4.1–4.2). Dùng chung cho Chronicle và Forge, để mọi nơi tính một ngày
 * có lịch hay không ra cùng một kết quả.
 */
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

export interface HabitScheduleHistory {
  type: 'BUILD' | 'QUIT';
  createdOn: CalendarDay;
  /** Sắp theo effectiveOn tăng dần. */
  lifecycle: HabitLifecycleEntry[];
  schedules: HabitScheduleEntry[];
}

// Dùng chung cho Habit và Routine — cùng quy tắc lifecycle, nên chỉ cần
// createdOn và lifecycle.
export function isAliveOn(
  subject: Pick<HabitScheduleHistory, 'createdOn' | 'lifecycle'>,
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

export function isDueOn(
  habit: HabitScheduleHistory,
  day: CalendarDay,
): boolean {
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
