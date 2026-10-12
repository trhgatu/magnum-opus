import type {
  ProjectCycleEndReason,
  ProjectCycleResponse,
} from "@repo/contracts";

import { Badge } from "@/components/ui/badge";
import { ProjectOutcomeHistory } from "@/features/project/components/project-outcome-history";
import {
  formatDateOnly,
  formatInstantDay,
} from "@/features/project/lib/cycle-dates";

const END_REASON_LABEL: Record<ProjectCycleEndReason, string> = {
  COMPLETED: "Hoàn thành",
  STOPPED: "Đã dừng",
};

/** FR-PRJ-017: Cycle đã đóng là lịch sử bất biến — chỉ đọc, không có
 * thao tác nào. Thứ tự (mới nhất trước) do API quyết định. */
export function ProjectClosedCycles({
  cycles,
  timeZone,
}: {
  /** null khi không tải được danh sách — báo lỗi ngay trong mục này thay
   * vì làm như Project chưa từng có Cycle nào đóng. */
  cycles: ProjectCycleResponse[] | null;
  timeZone: string;
}) {
  if (cycles === null) {
    return (
      <p role="status" className="text-sm text-muted-foreground">
        Chưa tải được các chu kỳ đã đóng. Tải lại trang để thử lại.
      </p>
    );
  }

  if (cycles.length === 0) return null;

  return (
    <section
      aria-labelledby="project-closed-cycles"
      className="flex flex-col gap-3"
    >
      <h2
        id="project-closed-cycles"
        className="text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground"
      >
        Các chu kỳ đã đóng
      </h2>

      {cycles.map((cycle) => {
        const headingId = `closed-cycle-${cycle.id}`;

        return (
          <article
            key={cycle.id}
            aria-labelledby={headingId}
            className="flex flex-col gap-3 rounded-3xl border bg-card/40 px-5 py-5 sm:px-7"
          >
            <header className="flex flex-wrap items-center justify-between gap-2">
              <h3 id={headingId} className="font-semibold">
                Cycle {cycle.cycleNumber}
              </h3>
              <span className="flex items-center gap-2 font-mono text-xs text-muted-foreground">
                <time dateTime={cycle.startedAt}>
                  {formatInstantDay(cycle.startedAt, timeZone)}
                </time>
                <span aria-hidden="true">→</span>
                {cycle.endedAt ? (
                  <time dateTime={cycle.endedAt}>
                    {formatInstantDay(cycle.endedAt, timeZone)}
                  </time>
                ) : null}
                {cycle.endReason ? (
                  <Badge
                    variant={
                      cycle.endReason === "STOPPED"
                        ? "destructive"
                        : "secondary"
                    }
                  >
                    {END_REASON_LABEL[cycle.endReason]}
                  </Badge>
                ) : null}
              </span>
            </header>

            <p className="text-sm leading-6">
              {cycle.intendedOutcome ?? (
                <span className="text-muted-foreground">
                  Chưa xác định outcome
                </span>
              )}
            </p>

            {cycle.targetEndAt ? (
              <p className="text-xs text-muted-foreground">
                Dự kiến kết thúc{" "}
                <time dateTime={cycle.targetEndAt}>
                  {formatDateOnly(cycle.targetEndAt)}
                </time>
              </p>
            ) : null}

            {cycle.closingNote ? (
              <div className="flex flex-col gap-1">
                <p className="text-xs font-semibold text-muted-foreground">
                  Ghi chú khép lại
                </p>
                <p className="whitespace-pre-line text-sm leading-6">
                  {cycle.closingNote}
                </p>
              </div>
            ) : null}

            <ProjectOutcomeHistory
              history={cycle.outcomeHistory}
              timeZone={timeZone}
            />
          </article>
        );
      })}
    </section>
  );
}
