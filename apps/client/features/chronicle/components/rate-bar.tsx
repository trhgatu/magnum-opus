import { cn } from "@/lib/utils";

interface RateBarProps {
  /** 0–1 */
  value: number;
  label: string;
  className?: string;
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export function RateBar({ value, label, className }: RateBarProps) {
  const clamped = Math.min(Math.max(value, 0), 1);

  return (
    <div
      role="img"
      aria-label={`${label}: ${formatPercent(clamped)}`}
      className={cn(
        "h-2 w-full overflow-hidden rounded-full bg-muted",
        className,
      )}
    >
      <div
        className="h-full rounded-full bg-primary transition-[width]"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
