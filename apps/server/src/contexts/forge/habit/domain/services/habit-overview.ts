import {
  addDays,
  type CalendarDay,
  daysBetween,
} from '@shared/domain/calendar-day';
import {
  type HabitScheduleHistory,
  isAliveOn,
  isDueOn,
} from '@shared/domain/habit-schedule';

/**
 * Một ngày trong dải 7 ngày của danh sách Thói quen (BA habit v3 §4):
 * - DONE: đã ghi dấu (BUILD) hoặc không tái phạm (QUIT)
 * - MISSED: có lịch mà bỏ lỡ (BUILD) hoặc tái phạm (QUIT)
 * - REST: Habit đang rèn nhưng ngày đó không có lịch
 * - PENDING: hôm nay, chưa xong nhưng ngày chưa hết
 * - UNTRACKED: Habit chưa tồn tại, đang lưu trữ, hoặc chưa bắt đầu bỏ
 */
export type HabitDayMark = 'DONE' | 'MISSED' | 'REST' | 'PENDING' | 'UNTRACKED';

export interface HabitOverviewHistory extends HabitScheduleHistory {
  checkInDays: ReadonlySet<CalendarDay>;
  quitStartedOn: CalendarDay | null;
  /** Ngày lịch (theo múi giờ owner) của các lần tái phạm từ quitStartedOn. */
  relapseDays: ReadonlySet<CalendarDay>;
}

export interface HabitOverview {
  dueToday: boolean;
  checkedInToday: boolean;
  /** BUILD: số buổi có lịch liên tiếp đã ghi dấu. QUIT: số ngày không tái phạm. */
  currentStreak: number;
  /** BUILD: chuỗi dài nhất từ lúc tạo. QUIT: null. */
  longestStreak: number | null;
  /** 7 ngày, cũ nhất trước, ngày cuối là hôm nay. */
  lastSevenDays: Array<{ date: CalendarDay; mark: HabitDayMark }>;
  /** BUILD: buổi có lịch tiếp theo sau hôm nay, trong 7 ngày tới. */
  nextDueOn: CalendarDay | null;
}

const WEEK = 7;

export function summarizeHabitOverview(
  habit: HabitOverviewHistory,
  today: CalendarDay,
): HabitOverview {
  return habit.type === 'QUIT'
    ? summarizeQuit(habit, today)
    : summarizeBuild(habit, today);
}

function summarizeBuild(
  habit: HabitOverviewHistory,
  today: CalendarDay,
): HabitOverview {
  const done = (day: CalendarDay) => habit.checkInDays.has(day);

  // Lùi từ hôm nay: ngày không có lịch không làm đứt chuỗi; hôm nay chưa ghi
  // dấu cũng không, vì ngày chưa hết (BR-HAB3-002).
  let currentStreak = 0;
  for (let day = today; day >= habit.createdOn; day = addDays(day, -1)) {
    if (!isDueOn(habit, day)) continue;
    if (done(day)) currentStreak += 1;
    else if (day !== today) break;
  }

  let longestStreak = 0;
  let run = 0;
  for (let day = habit.createdOn; day <= today; day = addDays(day, 1)) {
    if (!isDueOn(habit, day)) continue;
    if (done(day)) {
      run += 1;
      longestStreak = Math.max(longestStreak, run);
    } else if (day !== today) {
      run = 0;
    }
  }

  let nextDueOn: CalendarDay | null = null;
  for (let offset = 1; offset <= WEEK; offset += 1) {
    const day = addDays(today, offset);
    if (isDueOn(habit, day)) {
      nextDueOn = day;
      break;
    }
  }

  return {
    dueToday: isDueOn(habit, today),
    checkedInToday: done(today),
    currentStreak,
    longestStreak,
    lastSevenDays: lastSevenDays(today, (day) => {
      if (!isAliveOn(habit, day)) return 'UNTRACKED';
      if (done(day)) return 'DONE';
      if (!isDueOn(habit, day)) return 'REST';
      return day === today ? 'PENDING' : 'MISSED';
    }),
    nextDueOn,
  };
}

function summarizeQuit(
  habit: HabitOverviewHistory,
  today: CalendarDay,
): HabitOverview {
  const { quitStartedOn } = habit;
  let since = quitStartedOn;
  for (const day of habit.relapseDays) {
    if (day <= today && (since === null || day > since)) since = day;
  }

  return {
    dueToday: false,
    checkedInToday: false,
    currentStreak: since === null ? 0 : Math.max(0, daysBetween(since, today)),
    longestStreak: null,
    lastSevenDays: lastSevenDays(today, (day) => {
      if (
        quitStartedOn === null ||
        day < quitStartedOn ||
        !isAliveOn(habit, day)
      ) {
        return 'UNTRACKED';
      }
      if (habit.relapseDays.has(day)) return 'MISSED';
      return day === today ? 'PENDING' : 'DONE';
    }),
    nextDueOn: null,
  };
}

function lastSevenDays(
  today: CalendarDay,
  markOf: (day: CalendarDay) => HabitDayMark,
): HabitOverview['lastSevenDays'] {
  const days: HabitOverview['lastSevenDays'] = [];
  for (let offset = WEEK - 1; offset >= 0; offset -= 1) {
    const day = addDays(today, -offset);
    days.push({ date: day, mark: markOf(day) });
  }
  return days;
}
