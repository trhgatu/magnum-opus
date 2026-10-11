import type { ChronicleMoodSection, MoodLabel } from "@repo/contracts";

import { MOOD_OPTIONS } from "@/features/mood/config/mood-labels";

// Mỗi mood 1 màu cố định, không trùng nhau: theme chỉ có 5 màu chart nên 5
// mood sau dùng lại 5 màu đó ở độ đậm thấp hơn.
const MOOD_COLORS: Record<MoodLabel, string> = {
  JOYFUL: "bg-chart-1",
  CALM: "bg-chart-2",
  HOPEFUL: "bg-chart-3",
  ENERGETIC: "bg-chart-4",
  NEUTRAL: "bg-chart-5",
  TIRED: "bg-chart-1/45",
  ANXIOUS: "bg-chart-2/45",
  SAD: "bg-chart-3/45",
  ANGRY: "bg-chart-4/45",
  OVERWHELMED: "bg-chart-5/45",
};

interface MoodDistributionBarProps {
  distribution: ChronicleMoodSection["distribution"];
}

export function MoodDistributionBar({
  distribution,
}: MoodDistributionBarProps) {
  // Màu gắn theo mood (không theo vị trí) nên không nhảy giữa các tháng.
  const segments = MOOD_OPTIONS.flatMap((option) => {
    const mood = option.value as MoodLabel;
    const count = distribution[mood] ?? 0;

    return count > 0 ? [{ ...option, count, color: MOOD_COLORS[mood] }] : [];
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
        {segments.map((segment) => (
          <div
            key={segment.value}
            className={segment.color}
            style={{ width: `${(segment.count / total) * 100}%` }}
          />
        ))}
      </div>
      <ul className="flex flex-wrap gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        {segments.map((segment) => (
          <li key={segment.value} className="flex items-center gap-1.5">
            <span
              className={`size-2 rounded-full ${segment.color}`}
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
