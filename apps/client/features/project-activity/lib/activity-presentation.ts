import type {
  ActivityDay,
  ActivityDayState,
  ActivitySourceResponse,
  CycleActivityResponse,
  Divergence,
} from "@repo/contracts";

import { sourceErrorCopy } from "./source-status";

/** Cycle dài hơn chừng này ngày: dải xuống dòng theo tuần (06 §8.2). */
export const WEEK_ROWS_AFTER_DAYS = 70;

const count = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

/** Dòng tóm tắt của vòng (06 §8.3). Không so sánh với vòng trước. */
export function summaryLine(cycle: CycleActivityResponse): string {
  const { days, metrics } = cycle;
  const missingDays = days.filter((day) => day.state === "NO_DATA").length;
  if (days.length > 0 && missingDays === days.length) {
    return "Chưa có dữ liệu hoạt động cho vòng này.";
  }
  const partial = missingDays > 0 ? " (một số ngày chưa có dữ liệu)" : "";

  const hasActivity =
    metrics.activeDays > 0 ||
    metrics.commits > 0 ||
    metrics.prsOpened > 0 ||
    metrics.prsMerged > 0;
  if (!hasActivity) return `Chưa có hoạt động trong vòng này.${partial}`;

  const paused =
    metrics.pausedActiveDays > 0
      ? ` (${count(metrics.pausedActiveDays)} ngày lúc tạm dừng)`
      : "";
  // Metric bằng 0 vẫn hiện khi có hoạt động khác.
  return (
    `${count(metrics.activeDays)} ngày có hoạt động${paused} · ` +
    `${count(metrics.commits)} commit · ${count(metrics.prsOpened)} PR mở · ` +
    `${count(metrics.prsMerged)} PR merge${partial}`
  );
}

const dayKey = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);

const time = (date: Date, timeZone: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    timeZone,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(date);

/** "dd/mm" — ghép tay vì dấu phân cách của vi-VN khác nhau giữa các ICU. */
const shortDay = (date: Date, timeZone: string) => {
  const [, month, day] = dayKey(date, timeZone).split("-");
  return `${day}/${month}`;
};

/** "hôm nay, 14:20" / "hôm qua, 21:05" / "12/10, 09:30" (06 §8.4, §11). */
export function formatRecent(iso: string, timeZone: string, now: Date): string {
  const at = new Date(iso);
  const today = dayKey(now, timeZone);
  const yesterday = dayKey(new Date(now.getTime() - 86_400_000), timeZone);
  const day = dayKey(at, timeZone);
  const prefix =
    day === today
      ? "hôm nay"
      : day === yesterday
        ? "hôm qua"
        : shortDay(at, timeZone);
  return `${prefix}, ${time(at, timeZone)}`;
}

/**
 * "Hoạt động gần nhất: … · Cập nhật lúc …" — cập nhật là lần sớm nhất trong
 * các nguồn: mọi nguồn đều mới ít nhất tới đó (06 §8.4).
 */
export function freshnessLine(
  cycle: CycleActivityResponse,
  sources: readonly ActivitySourceResponse[],
  timeZone: string,
  now: Date,
): string | null {
  const parts: string[] = [];
  if (cycle.lastActivityAt) {
    parts.push(
      `Hoạt động gần nhất: ${formatRecent(cycle.lastActivityAt, timeZone, now)}`,
    );
  }
  const syncs = sources
    .map((source) => source.lastSyncAt)
    .filter((value): value is string => value !== null)
    .map((value) => Date.parse(value));
  if (syncs.length > 0) {
    const earliest = new Date(Math.min(...syncs));
    parts.push(
      dayKey(earliest, timeZone) === dayKey(now, timeZone)
        ? `Cập nhật lúc ${time(earliest, timeZone)}`
        : `Cập nhật ${formatRecent(earliest.toISOString(), timeZone, now)}`,
    );
  }
  return parts.length > 0 ? parts.join(" · ") : null;
}

/** "trhgatu/old-repo: token đã hết hạn — cập nhật ở Cài đặt." (06 §8.1, §12). */
export function sourceErrorLines(
  sources: readonly ActivitySourceResponse[],
): string[] {
  return sources.flatMap((source) =>
    source.error
      ? [`${source.displayName}: ${sourceErrorCopy(source.error.code)}`]
      : [],
  );
}

export const DAY_STATE_LABEL: Record<ActivityDayState, string> = {
  ACTIVE: "có hoạt động",
  PAUSED_ACTIVE: "có hoạt động lúc tạm dừng",
  PAUSED_IDLE: "tạm dừng",
  IDLE: "không có hoạt động",
  NO_DATA: "chưa có dữ liệu",
};

/** "12/10: có hoạt động" — mô tả cho trình đọc màn hình (06 §8.2). */
export function dayDescription(day: ActivityDay): string {
  const [, month, date] = day.date.split("-");
  return `${date}/${month}: ${DAY_STATE_LABEL[day.state]}`;
}

/** Chỉ các trạng thái đang có trong dải, theo thứ tự cố định (06 §8.2). */
export function legendStates(days: readonly ActivityDay[]): ActivityDayState[] {
  const present = new Set(days.map((day) => day.state));
  return (Object.keys(DAY_STATE_LABEL) as ActivityDayState[]).filter((state) =>
    present.has(state),
  );
}

/** Câu chữ của từng chỗ lệch (06 §9). D2 có nút riêng, không nằm ở đây. */
export function divergenceText(
  divergence: Divergence,
  timeZone: string,
): string {
  switch (divergence.kind) {
    case "PAUSED_WITH_ACTIVITY":
      return `Có hoạt động trong ${count(divergence.activeDays)} ngày dù đang tạm dừng.`;
    case "ACTIVE_WITHOUT_ACTIVITY":
      return `Đã ${count(divergence.idleDays)} ngày chưa có hoạt động.`;
    case "ACTIVITY_AFTER_CLOSE": {
      const since = divergence.closedAs === "COMPLETED" ? "hoàn thành" : "dừng";
      const last = shortDay(new Date(divergence.lastActivityAt), timeZone);
      // Chỉ có commit thì nói commit; có cả PR thì đếm chung là hoạt động.
      const what =
        divergence.otherEvents === 0
          ? `${count(divergence.commits)} commit`
          : `${count(divergence.commits + divergence.otherEvents)} hoạt động`;
      return `${what} kể từ khi ${since} (gần nhất ${last}).`;
    }
    case "ACTIVITY_BEFORE_START":
      return "Đã có hoạt động dù Project chưa bắt đầu.";
  }
}
