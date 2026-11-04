import type {
  ForgeTodayResponse,
  HabitOverviewItemResponse,
} from "@repo/contracts";

/**
 * Việc của hôm nay: Habit BUILD có lịch hôm nay hoặc đã ghi dấu hôm nay, theo
 * thứ tự của trang Hôm nay (Nếp sinh hoạt trước, rồi Habit riêng lẻ). Dòng
 * dùng dữ liệu của tổng quan (vòng, 7 ngày, chuỗi).
 */
export function todayHabits(
  today: Pick<ForgeTodayResponse, "routines" | "standaloneHabits">,
  overview: readonly HabitOverviewItemResponse[],
): HabitOverviewItemResponse[] {
  const byId = new Map(overview.map((habit) => [habit.id, habit]));
  const ordered = [
    ...today.routines.flatMap((routine) => routine.habits),
    ...today.standaloneHabits,
  ]
    .map((habit) => byId.get(habit.id))
    .filter((habit): habit is HabitOverviewItemResponse => habit !== undefined);

  // Một Habit có thể nằm trong nhiều Nếp: chỉ giữ lần đầu.
  const seen = new Set<string>();
  const unique = ordered.filter((habit) => {
    if (seen.has(habit.id)) return false;
    seen.add(habit.id);
    return true;
  });

  // Ghi dấu vào ngày nghỉ thì /forge/today không liệt kê, nhưng hôm nay vẫn
  // là việc đã làm (BR-HAB3-006).
  const extra = overview.filter(
    (habit) =>
      habit.type === "BUILD" && habit.checkedInToday && !seen.has(habit.id),
  );
  return [...unique, ...extra];
}

export interface RoutineProgress {
  id: string;
  title: string;
  total: number;
  done: number;
  /** Bước chưa ghi dấu đầu tiên, theo thứ tự của Nếp. */
  next: string | null;
  /** Số thứ tự (từ 1) của bước đó; null khi đã xong hết. */
  nextStep: number | null;
  steps: Array<"done" | "next" | "todo">;
}

export function routineProgress(
  routine: ForgeTodayResponse["routines"][number],
  overview: readonly HabitOverviewItemResponse[],
): RoutineProgress {
  const checked = new Set(
    overview.filter((habit) => habit.checkedInToday).map((habit) => habit.id),
  );
  const isDone = (id: string, fallback: boolean) =>
    overview.some((habit) => habit.id === id) ? checked.has(id) : fallback;

  const doneFlags = routine.habits.map((habit) =>
    isDone(habit.id, habit.checkedIn),
  );
  const nextIndex = doneFlags.indexOf(false);

  return {
    id: routine.id,
    title: routine.title,
    total: routine.habits.length,
    done: doneFlags.filter(Boolean).length,
    next: nextIndex === -1 ? null : routine.habits[nextIndex]!.title,
    nextStep: nextIndex === -1 ? null : nextIndex + 1,
    steps: doneFlags.map((done, index) =>
      done ? "done" : index === nextIndex ? "next" : "todo",
    ),
  };
}

/** Lời chào theo giờ ở múi giờ tài khoản. */
export function greetingAt(now: Date, timeZone: string): string {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", {
      hour: "2-digit",
      hourCycle: "h23",
      timeZone,
    }).format(now),
  );
  if (hour < 4) return "Khuya rồi.";
  if (hour < 11) return "Chào buổi sáng.";
  if (hour < 14) return "Chào buổi trưa.";
  if (hour < 18) return "Chào buổi chiều.";
  return "Chào buổi tối.";
}

/** "Thứ Tư · 4 tháng 11" cho ngày lịch YYYY-MM-DD. */
export function formatTodayLabel(date: string): string {
  const day = new Date(`${date}T00:00:00.000Z`);
  const weekday = new Intl.DateTimeFormat("vi-VN", {
    weekday: "long",
    timeZone: "UTC",
  }).format(day);
  const dayMonth = new Intl.DateTimeFormat("vi-VN", {
    day: "numeric",
    month: "long",
    timeZone: "UTC",
  }).format(day);
  return `${weekday.charAt(0).toLocaleUpperCase("vi")}${weekday.slice(1)} · ${dayMonth}`;
}

export interface TodayGroup {
  /** id của Nếp, "standalone" (thói quen lẻ có lịch) hoặc "extra" (làm thêm ngoài lịch). */
  key: string;
  /** Nếp sinh hoạt của nhóm; null với nhóm thói quen lẻ và nhóm làm thêm. */
  routine: RoutineProgress | null;
  items: HabitOverviewItemResponse[];
}

/**
 * Việc hôm nay nhóm theo Nếp sinh hoạt (theo thứ tự của Nếp), rồi nhóm
 * thói quen lẻ. Habit thuộc nhiều Nếp chỉ hiện ở Nếp đầu tiên; tiến độ của
 * các Nếp sau vẫn tính nó.
 */
export function todayGroups(
  today: Pick<ForgeTodayResponse, "routines" | "standaloneHabits">,
  overview: readonly HabitOverviewItemResponse[],
): TodayGroup[] {
  const ordered = todayHabits(today, overview);
  const byId = new Map(ordered.map((habit) => [habit.id, habit]));
  const placed = new Set<string>();
  const groups: TodayGroup[] = [];

  for (const routine of today.routines) {
    const progress = routineProgress(routine, overview);
    if (progress.total === 0) continue;
    const items = routine.habits
      .map((habit) => byId.get(habit.id))
      .filter(
        (habit): habit is HabitOverviewItemResponse =>
          habit !== undefined && !placed.has(habit.id),
      );
    items.forEach((habit) => placed.add(habit.id));
    groups.push({ key: routine.id, routine: progress, items });
  }

  const rest = ordered.filter((habit) => !placed.has(habit.id));
  // Ghi dấu vào ngày nghỉ: không thuộc lịch hôm nay, kể cả khi Habit nằm
  // trong một Nếp, nên tách khỏi thói quen lẻ có lịch.
  const standalone = rest.filter((habit) => habit.dueToday);
  const extra = rest.filter((habit) => !habit.dueToday);
  if (standalone.length > 0)
    groups.push({ key: "standalone", routine: null, items: standalone });
  if (extra.length > 0)
    groups.push({ key: "extra", routine: null, items: extra });
  return groups;
}

export const HOLDING_LIMIT = 3;

export const relapsedToday = (habit: HabitOverviewItemResponse) =>
  habit.lastSevenDays.at(-1)?.mark === "MISSED";

/**
 * Thói quen Từ bỏ đáng nhắc nhất ở đầu trang: vừa tái phạm hôm nay trước,
 * rồi chuỗi ngắn trước (dễ gãy nhất), cùng chuỗi thì theo tên. Phần vượt quá
 * `limit` gom thành số "còn lại".
 */
export function holdingHighlights(
  habits: readonly HabitOverviewItemResponse[],
  limit = HOLDING_LIMIT,
): { shown: HabitOverviewItemResponse[]; more: number } {
  const quitting = habits
    .filter((habit) => habit.type === "QUIT")
    .sort(
      (a, b) =>
        Number(relapsedToday(b)) - Number(relapsedToday(a)) ||
        a.currentStreak - b.currentStreak ||
        a.title.localeCompare(b.title, "vi"),
    );
  return {
    shown: quitting.slice(0, limit),
    more: Math.max(0, quitting.length - limit),
  };
}
