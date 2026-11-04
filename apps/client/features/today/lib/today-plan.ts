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
