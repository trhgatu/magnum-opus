import type { HabitDayMark, HabitOverviewItemResponse } from "@repo/contracts";

import {
  formatHabitFrequency,
  ISO_WEEKDAYS,
} from "@/features/habit/lib/habit-frequency";
import { formatQuitStartedAt } from "@/features/habit/lib/habit-quit";

export type HabitOverviewGroupKey = "pending" | "done" | "rest" | "quit";

export interface HabitOverviewGroup {
  key: HabitOverviewGroupKey;
  title: string;
  items: HabitOverviewItemResponse[];
}

const GROUP_TITLES: Record<HabitOverviewGroupKey, string> = {
  pending: "Còn chờ hôm nay",
  done: "Đã ghi dấu hôm nay",
  rest: "Không có lịch hôm nay",
  quit: "Từ bỏ",
};

const GROUP_ORDER: HabitOverviewGroupKey[] = [
  "pending",
  "done",
  "rest",
  "quit",
];

/** Ghi dấu vào ngày nghỉ vẫn tính là đã ghi dấu hôm nay (BR-HAB3-006). */
export function habitOverviewGroupOf(
  habit: HabitOverviewItemResponse,
): HabitOverviewGroupKey {
  if (habit.type === "QUIT") return "quit";
  if (habit.checkedInToday) return "done";
  return habit.dueToday ? "pending" : "rest";
}

/** Giữ thứ tự theo tên của server trong từng nhóm; bỏ nhóm rỗng. */
export function groupHabitOverview(
  habits: readonly HabitOverviewItemResponse[],
): HabitOverviewGroup[] {
  return GROUP_ORDER.map((key) => ({
    key,
    title: GROUP_TITLES[key],
    items: habits.filter((habit) => habitOverviewGroupOf(habit) === key),
  })).filter((group) => group.items.length > 0);
}

const normalize = (value: string) =>
  value.normalize("NFC").toLocaleLowerCase("vi");

export function filterHabitOverview(
  habits: readonly HabitOverviewItemResponse[],
  search: string,
): HabitOverviewItemResponse[] {
  const needle = normalize(search.trim());
  if (!needle) return [...habits];
  return habits.filter((habit) => normalize(habit.title).includes(needle));
}

const DAY_MS = 24 * 60 * 60 * 1000;

const isoWeekdayOf = (day: string) => {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
};

const daysBetween = (from: string, to: string) =>
  Math.round(
    (Date.parse(`${to}T00:00:00.000Z`) - Date.parse(`${from}T00:00:00.000Z`)) /
      DAY_MS,
  );

/** "ngày mai" hoặc "thứ Tư", "chủ nhật". */
export function formatNextDue(nextDueOn: string, today: string): string {
  if (daysBetween(today, nextDueOn) === 1) return "ngày mai";
  const label =
    ISO_WEEKDAYS.find((day) => day.value === isoWeekdayOf(nextDueOn))?.label ??
    nextDueOn;
  return label.charAt(0).toLocaleLowerCase("vi") + label.slice(1);
}

export function formatCheckInTime(checkedInAt: string, timeZone: string) {
  return new Intl.DateTimeFormat("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone,
  }).format(new Date(checkedInAt));
}

/** Dòng phụ dưới tên: lịch, việc hôm nay, Nếp sinh hoạt chứa nó. */
export function describeHabitOverview(
  habit: HabitOverviewItemResponse,
  { today, timeZone }: { today: string; timeZone: string },
): string {
  const parts: string[] = [];

  if (habit.type === "QUIT") {
    if (habit.quitStartedAt) {
      parts.push(`Tính từ ${formatQuitStartedAt(habit.quitStartedAt)}`);
    }
  } else {
    parts.push(formatHabitFrequency(habit.frequencyType, habit.frequencyDays));
    if (habit.checkedInAt) {
      parts.push(`lúc ${formatCheckInTime(habit.checkedInAt, timeZone)}`);
    } else if (!habit.dueToday && habit.nextDueOn) {
      parts.push(`lần tới ${formatNextDue(habit.nextDueOn, today)}`);
    }
  }

  if (habit.routines.length > 0) {
    parts.push(
      `thuộc ${habit.routines.map((routine) => routine.title).join(", ")}`,
    );
  }

  return parts.join(" · ");
}

const MARK_LABELS: Record<HabitDayMark, { build: string; quit: string }> = {
  DONE: { build: "đã làm", quit: "không tái phạm" },
  MISSED: { build: "bỏ lỡ", quit: "tái phạm" },
  REST: { build: "nghỉ", quit: "nghỉ" },
  PENDING: { build: "chưa làm", quit: "đang giữ" },
  UNTRACKED: { build: "chưa theo dõi", quit: "chưa theo dõi" },
};

/** Nhãn đọc màn hình cho dải 7 ngày, vd "7 ngày qua: 5 đã làm, 1 bỏ lỡ, 1 chưa làm". */
export function describeLastSevenDays(
  habit: Pick<HabitOverviewItemResponse, "type" | "lastSevenDays">,
): string {
  const kind = habit.type === "QUIT" ? "quit" : "build";
  const counts = new Map<string, number>();
  for (const day of habit.lastSevenDays) {
    const label = MARK_LABELS[day.mark][kind];
    counts.set(label, (counts.get(label) ?? 0) + 1);
  }
  const summary = [...counts]
    .map(([label, count]) => `${count} ${label}`)
    .join(", ");
  return `7 ngày qua: ${summary}`;
}
