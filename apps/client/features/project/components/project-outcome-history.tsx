import type { OutcomeEntryResponse } from "@repo/contracts";

import { Badge } from "@/components/ui/badge";
import { formatInstantDay } from "@/features/project/lib/cycle-dates";

/** Lịch sử append-only của intended outcome (BR-PRJ-032). Không có hook
 * nào nên dùng được ở cả Server Component (chu kỳ đã đóng) lẫn Client
 * Component (chu kỳ đang mở). Chỉ hiện khi outcome từng được đổi — một
 * lần đặt duy nhất thì chưa có gì để gọi là "lịch sử". */
export function ProjectOutcomeHistory({
  history,
  timeZone,
}: {
  history: OutcomeEntryResponse[];
  timeZone: string;
}) {
  if (history.length < 2) return null;

  const newestFirst = [...history].reverse();

  return (
    <details className="text-sm">
      <summary className="cursor-pointer text-xs font-medium text-muted-foreground hover:text-foreground">
        Lịch sử outcome ({history.length} lần đặt)
      </summary>
      <ol className="mt-3 flex flex-col gap-3 border-l pl-4">
        {newestFirst.map((entry, index) => (
          <li key={history.length - index} className="flex flex-col gap-1">
            <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
              <time dateTime={entry.setAt}>
                {formatInstantDay(entry.setAt, timeZone)}
              </time>
              {index === 0 ? <Badge variant="secondary">Mới nhất</Badge> : null}
            </span>
            <span
              className={
                index === 0 ? "leading-6" : "leading-6 text-muted-foreground"
              }
            >
              {entry.outcome}
            </span>
          </li>
        ))}
      </ol>
    </details>
  );
}
