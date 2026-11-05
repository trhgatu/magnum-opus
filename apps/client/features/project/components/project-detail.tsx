import type { ProjectCycleResponse, ProjectResponse } from "@repo/contracts";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import {
  ProjectDetailDescription,
  ProjectDetailTitle,
  ProjectEditAction,
  ProjectFieldsProvider,
  ProjectLifecycleControlsInline,
  ProjectOutcomeEditorInline,
  ProjectTargetEndEditorInline,
} from "@/features/project/components/project-inline-fields";
import { ProjectClosedCycles } from "@/features/project/components/project-closed-cycles";
import { ProjectCycleStrip } from "@/features/project/components/project-cycle-strip";
import { todayInTimeZone } from "@/features/project/lib/cycle-dates";

const STATE_LABEL: Record<ProjectResponse["lifecycleState"], string> = {
  NOT_STARTED: "Chưa bắt đầu",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  STOPPED: "Đã dừng",
  COMPLETED: "Hoàn thành",
};

export function ProjectDetail({
  project,
  closedCycles,
  timeZone,
  activity,
  activityNotes,
  closedCycleActivity,
  sourcesAction,
}: {
  project: ProjectResponse;
  /** null khi không tải được — xem page.tsx. */
  closedCycles: ProjectCycleResponse[] | null;
  timeZone: string;
  /** "Hoạt động của vòng này" — trong thẻ Cycle đang mở, sau ngày dự kiến. */
  activity?: ReactNode;
  /** Chỗ lệch D3/D4 — ngay dưới phần đầu trang. */
  activityNotes?: ReactNode;
  /** Snapshot hoạt động của từng Cycle đã đóng, theo id Cycle. */
  closedCycleActivity?: Record<string, ReactNode>;
  /** Nút "Nguồn hoạt động" — đứng trước các nút đổi trạng thái. */
  sourcesAction?: ReactNode;
}) {
  const hasOpenCycle =
    project.lifecycleState === "ACTIVE" || project.lifecycleState === "PAUSED";
  const today = todayInTimeZone(timeZone);

  return (
    <article
      className="flex w-full flex-col gap-8"
      aria-labelledby="project-title"
    >
      <Link
        href="/projects"
        className="inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <ArrowLeft className="size-4" aria-hidden="true" /> Tất cả Project
      </Link>

      <ProjectFieldsProvider key={project.id} initialProject={project}>
        <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
          <div className="flex max-w-3xl min-w-0 flex-col gap-2.5">
            <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
              Crucible · Project · {STATE_LABEL[project.lifecycleState]}
            </p>
            <h1
              id="project-title"
              className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] text-balance sm:text-[46px]"
            >
              <ProjectDetailTitle />
            </h1>
            <p className="max-w-2xl text-base leading-relaxed text-muted-foreground">
              <ProjectDetailDescription placeholder="Chưa có mô tả cho effort này." />
            </p>
          </div>
          <div className="flex flex-wrap gap-2.5">
            <ProjectEditAction />
            {sourcesAction}
            <ProjectLifecycleControlsInline />
          </div>
        </header>
        {activityNotes}

        {closedCycles ? (
          <ProjectCycleStrip
            closedCycles={closedCycles}
            currentCycle={hasOpenCycle ? project.currentCycle : null}
            paused={project.lifecycleState === "PAUSED"}
            today={today}
            timeZone={timeZone}
          />
        ) : null}

        {hasOpenCycle && project.currentCycle ? (
          <section
            aria-labelledby="project-current-cycle"
            className="flex flex-col gap-6 rounded-3xl bg-ember-soft px-5 py-6 sm:px-9 sm:py-8"
          >
            <h2
              id="project-current-cycle"
              className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase"
            >
              Kết quả mong muốn · Cycle {project.currentCycle.cycleNumber}
            </h2>
            <ProjectOutcomeEditorInline timeZone={timeZone} />
            <div className="border-t border-primary/15 pt-5">
              <ProjectTargetEndEditorInline today={today} />
            </div>
            {activity}
          </section>
        ) : null}
      </ProjectFieldsProvider>
      <ProjectClosedCycles
        cycles={closedCycles}
        timeZone={timeZone}
        activityByCycle={closedCycleActivity}
      />

      <footer className="flex flex-wrap justify-end gap-2 border-t pt-4 font-mono text-xs text-muted-foreground">
        <time dateTime={project.updatedAt}>
          Cập nhật{" "}
          {new Intl.DateTimeFormat("vi-VN", { dateStyle: "medium" }).format(
            new Date(project.updatedAt),
          )}
        </time>
      </footer>
    </article>
  );
}
