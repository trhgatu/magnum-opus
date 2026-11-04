import type { HabitOverviewItemEnvelope } from "@repo/contracts";

import {
  formatCheckInTime,
  formatNextDue,
} from "@/features/habit/lib/habit-overview";
import { formatQuitStartedAt } from "@/features/habit/lib/habit-quit";

/** Chữ cố định của khối "Hôm nay"; soạn ở server để bundle trang nhỏ. */
export interface HabitTodayLabels {
  /** "Thứ Hai, 2 tháng 11" */
  today: string;
  /** "Đã ghi dấu lúc 06:30." nếu đã ghi dấu trước khi mở trang. */
  checkedIn: string | null;
  /** Câu khi chưa ghi dấu: có lịch, nghỉ (kèm buổi tới) hoặc không có lịch. */
  idle: string;
  /** QUIT: ngày bắt đầu bỏ đã định dạng. */
  quitSince: string | null;
}

export function describeHabitToday({
  habit,
  date,
  timeZone,
}: HabitOverviewItemEnvelope): HabitTodayLabels {
  const today = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(new Date(`${date}T00:00:00.000Z`));

  return {
    today: today.charAt(0).toLocaleUpperCase("vi") + today.slice(1),
    checkedIn: habit.checkedInAt
      ? `Đã ghi dấu lúc ${formatCheckInTime(habit.checkedInAt, timeZone)}.`
      : null,
    idle: habit.dueToday
      ? "Hôm nay có lịch."
      : habit.nextDueOn
        ? `Hôm nay nghỉ, buổi tới ${formatNextDue(habit.nextDueOn, date)}.`
        : "Hôm nay không có lịch.",
    quitSince: habit.quitStartedAt
      ? formatQuitStartedAt(habit.quitStartedAt)
      : null,
  };
}
