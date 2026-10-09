import type { ChronicleMoodSection, MoodLabel } from "@repo/contracts";

import { MOOD_OPTIONS } from "@/features/mood/config/mood-labels";

const SEGMENT_COLORS = [
  "bg-chart-1",
  "bg-chart-2",
  "bg-chart-3",
  "bg-chart-4",
  "bg-chart-5",
];

interface MoodDistributionBarProps {
  distribution: ChronicleMoodSection["distribution"];
}

export function MoodDistributionBar({
  distribution,
}: MoodDistributionBarProps) {
  // Giữ thứ tự cố định của MOOD_OPTIONS để màu của 1 mood không nhảy giữa
  // các tháng.
  const segments = MOOD_OPTIONS.flatMap((option) => {
    const count = distribution[option.value as MoodLabel] ?? 0;

    return count > 0 ? [{ ...option, count }] : [];
  });
  const total = segments.reduce((sum, segment) => sum + segment.count, 0);

  if (total === 0) {
    return null;
  }

  const summary = segments
    .map((segment) => `${segment.label} ${segment.count}`)
    .join(", ");

  return (
    <div className="flex flex-col gap-3">
      <div
        role="img"
        aria-label={`Phân bố tâm trạng: ${summary}`}
        className="flex h-2.5 w-full overflow-hidden rounded-full bg-muted"
      >
        {segments.map((segment, index) => (
          <div
            key={segment.value}
            className={SEGMENT_COLORS[index % SEGMENT_COLORS.length]}
            style={{ width: `${(segment.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {segments.map((segment, index) => (
          <li key={segment.value} className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${SEGMENT_COLORS[index % SEGMENT_COLORS.length]}`}
              aria-hidden="true"
            />
            <span>
              {segment.symbol} {segment.label}
            </span>
            <span className="font-mono tabular-nums">{segment.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
