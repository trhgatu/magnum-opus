import type {
  ActivityDay,
  ActivityDayState,
  ActivityMetrics,
} from "@repo/contracts";

import { cn } from "@/lib/utils";

/** Số ô to: một tuần gần nhất của vòng, dải nhỏ bên dưới giữ cả vòng. */
export const RECENT_DAYS = 7;

const WEEKDAYS = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"];

const count = (value: number) => new Intl.NumberFormat("vi-VN").format(value);

const hours = (seconds: number) =>
  new Intl.NumberFormat("vi-VN", {
    maximumFractionDigits: 1,
  }).format(Math.floor(seconds / 360) / 10);

/** Giây thành chữ ngắn trên ô: "1,2 giờ", "40 phút". Làm tròn xuống. */
export function shortCodingTime(seconds: number): string {
  if (seconds < 60) return "dưới 1 phút";
  if (seconds < 3600) return `${Math.floor(seconds / 60)} phút`;
  return `${hours(seconds)} giờ`;
}

const STATE_TEXT: Record<ActivityDayState, string> = {
  ACTIVE: "có hoạt động",
  PAUSED_ACTIVE: "có hoạt động lúc tạm dừng",
  PAUSED_IDLE: "tạm dừng",
  IDLE: "không hoạt động",
  NO_DATA: "chưa có dữ liệu",
};

/** "T5 29/10" từ ngày lịch YYYY-MM-DD. */
export function dayLabel(date: string): string {
  const [, month, day] = date.split("-");
  const weekday = WEEKDAYS[new Date(`${date}T00:00:00.000Z`).getUTCDay()];
  return `${weekday} ${day}/${month}`;
}

/**
 * Chữ dưới ô: giờ code và số commit nếu có ("2,5 giờ · 3 commit"), không
 * thì trạng thái của ngày.
 */
export function dayValue(day: ActivityDay): string {
  const parts: string[] = [];
  if (day.codingSeconds !== null && day.codingSeconds > 0) {
    parts.push(shortCodingTime(day.codingSeconds));
  }
  if (day.commits !== null && day.commits > 0) {
    parts.push(`${count(day.commits)} commit`);
  }
  return parts.length > 0 ? parts.join(" · ") : STATE_TEXT[day.state];
}

/**
 * Thước đo độ đậm của các ô đang hiện: giờ code nếu có ngày nào code, không
 * thì số commit (Project chỉ có GitHub).
 */
function intensityOf(days: readonly ActivityDay[]) {
  const seconds = Math.max(0, ...days.map((day) => day.codingSeconds ?? 0));
  if (seconds > 0) {
    return { max: seconds, of: (day: ActivityDay) => day.codingSeconds ?? 0 };
  }
  const commits = Math.max(0, ...days.map((day) => day.commits ?? 0));
  return { max: commits, of: (day: ActivityDay) => day.commits ?? 0 };
}

/**
 * Độ đậm so với ngày nhiều nhất trong các ô đang hiện; ngày có hoạt động mà
 * không đo được gì (vd chỉ có PR) tô mức giữa.
 */
function tileClass(
  day: ActivityDay,
  intensity: ReturnType<typeof intensityOf>,
): string {
  switch (day.state) {
    case "ACTIVE":
    case "PAUSED_ACTIVE": {
      const paused = day.state === "PAUSED_ACTIVE";
      const amount = intensity.of(day);
      if (amount === 0 || intensity.max === 0) {
        return paused ? "bg-ember/40" : "bg-ember/70";
      }
      const share = amount / intensity.max;
      const level =
        share > 0.66
          ? "bg-ember"
          : share > 0.33
            ? "bg-ember/70"
            : "bg-ember/40";
      return paused ? cn(level, "opacity-60") : level;
    }
    case "IDLE":
      return "border-[1.5px] border-trace-missed";
    case "PAUSED_IDLE":
    case "NO_DATA":
      return "border-[1.5px] border-dashed border-border";
  }
}

/** "Từng ngày của vòng này": các ngày gần nhất thành ô to, có chữ dưới ô. */
export function RecentDays({
  days,
  today,
}: {
  days: readonly ActivityDay[];
  today: string;
}) {
  const recent = days.slice(-RECENT_DAYS);
  if (recent.length === 0) return null;
  const intensity = intensityOf(recent);

  return (
    <ol
      aria-label="Từng ngày gần đây của vòng này"
      className="grid grid-cols-4 gap-2.5 sm:grid-cols-7"
    >
      {recent.map((day) => (
        <li key={day.date} className="flex min-w-0 flex-col gap-1.5">
          <span
            aria-hidden="true"
            className={cn(
              "h-14 rounded-xl sm:h-16",
              tileClass(day, intensity),
              day.date === today &&
                "ring-2 ring-primary ring-offset-2 ring-offset-ember-soft",
            )}
          />
          <span className="font-mono text-[11px] leading-snug text-muted-foreground">
            <span className={cn(day.date === today && "text-foreground")}>
              {day.date === today ? "hôm nay" : dayLabel(day.date)}
            </span>
            <br />
            {dayValue(day)}
          </span>
        </li>
      ))}
    </ol>
  );
}

function Metric({
  value,
  label,
  accent = false,
}: {
  value: string;
  label: string;
  accent?: boolean;
}) {
  return (
    // dt phải đứng trước dd; số to vẫn hiện ở trên nhờ flex-col-reverse.
    <div className="flex flex-col-reverse gap-1">
      <dt className="text-[13px] text-muted-foreground">{label}</dt>
      <dd
        className={cn(
          "font-display text-[44px] leading-[0.95] tabular-nums sm:text-[52px]",
          accent && "text-primary",
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** Ba con số lớn của vòng; không có GitHub thì không nói commit. */
export function CycleMetrics({
  metrics,
  hasGitHub,
}: {
  metrics: ActivityMetrics;
  hasGitHub: boolean;
}) {
  return (
    <dl className="flex flex-wrap gap-x-10 gap-y-4">
      <Metric
        value={count(metrics.activeDays)}
        label="ngày có hoạt động"
        accent
      />
      {hasGitHub ? (
        <Metric value={count(metrics.commits)} label="commit" />
      ) : null}
      {metrics.codingSeconds !== null ? (
        <Metric value={hours(metrics.codingSeconds)} label="giờ code" />
      ) : null}
    </dl>
  );
}
