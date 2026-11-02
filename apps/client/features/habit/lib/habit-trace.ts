import type { HabitOverviewDayResponse, HabitType } from "@repo/contracts";

/** Một ô của lưới: ngày có dấu, hoặc chỗ trống trước ngày đầu / sau hôm nay. */
export type HabitTraceCell =
  | ({ kind: "day" } & HabitOverviewDayResponse)
  | { kind: "before" }
  | { kind: "after" };

export interface HabitTraceWeek {
  /** "Th 9" ở cột đầu của mỗi tháng, còn lại rỗng. */
  monthLabel: string;
  /** 7 ô, Thứ Hai trước. */
  cells: HabitTraceCell[];
}

const isoWeekdayOf = (day: string) => {
  const weekday = new Date(`${day}T00:00:00.000Z`).getUTCDay();
  return weekday === 0 ? 7 : weekday;
};

const monthOf = (day: string) => Number(day.slice(5, 7));

/**
 * Xếp dãy ngày (cũ nhất trước, cuối là hôm nay) thành các cột tuần bắt đầu
 * từ Thứ Hai, như lịch giấy: ô trước ngày đầu và sau hôm nay để trống.
 */
export function layoutHabitTrace(
  trace: readonly HabitOverviewDayResponse[],
): HabitTraceWeek[] {
  if (trace.length === 0) return [];

  const cells: HabitTraceCell[] = [
    ...Array.from(
      { length: isoWeekdayOf(trace[0]!.date) - 1 },
      () => ({ kind: "before" }) as const,
    ),
    ...trace.map((day) => ({ kind: "day" as const, ...day })),
  ];
  while (cells.length % 7 !== 0) cells.push({ kind: "after" });

  const weeks: HabitTraceWeek[] = [];
  let lastMonth = 0;
  for (let start = 0; start < cells.length; start += 7) {
    const week = cells.slice(start, start + 7);
    const firstDay = week.find((cell) => cell.kind === "day");
    const month = firstDay?.kind === "day" ? monthOf(firstDay.date) : lastMonth;
    weeks.push({
      monthLabel: month !== lastMonth ? `Th ${month}` : "",
      cells: week,
    });
    lastMonth = month;
  }
  return weeks;
}

export interface HabitTraceTally {
  done: number;
  missed: number;
}

export function tallyHabitTrace(
  trace: readonly HabitOverviewDayResponse[],
): HabitTraceTally {
  return {
    done: trace.filter((day) => day.mark === "DONE").length,
    missed: trace.filter((day) => day.mark === "MISSED").length,
  };
}

/** Nhãn đọc màn hình cho cả lưới. */
export function describeHabitTrace(
  type: HabitType,
  trace: readonly HabitOverviewDayResponse[],
): string {
  const { done, missed } = tallyHabitTrace(trace);
  const today = trace.at(-1);
  const todayPart =
    today?.mark === "PENDING"
      ? type === "QUIT"
        ? ", hôm nay đang giữ"
        : ", hôm nay chưa ghi dấu"
      : "";

  return type === "QUIT"
    ? `13 tuần gần nhất: ${done} ngày không tái phạm, ${missed} ngày tái phạm${todayPart}`
    : `13 tuần gần nhất: ${done} buổi đã ghi dấu, ${missed} buổi bỏ lỡ${todayPart}`;
}

const DAY_LABEL: Record<HabitOverviewDayResponse["mark"], [string, string]> = {
  DONE: ["đã ghi dấu", "không tái phạm"],
  MISSED: ["bỏ lỡ", "tái phạm"],
  REST: ["ngày nghỉ theo lịch", "ngày nghỉ"],
  PENDING: ["hôm nay, chưa ghi dấu", "hôm nay"],
  UNTRACKED: ["chưa theo dõi", "chưa theo dõi"],
};

/** Chú thích khi rê chuột lên một ô, vd "29/10: bỏ lỡ". */
export function describeTraceDay(
  type: HabitType,
  day: HabitOverviewDayResponse,
): string {
  const [, month, date] = day.date.split("-");
  const label = DAY_LABEL[day.mark][type === "QUIT" ? 1 : 0];
  return `${Number(date)}/${Number(month)}: ${label}`;
}
