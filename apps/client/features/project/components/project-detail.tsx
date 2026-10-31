import type { ProjectCycleResponse, ProjectResponse } from "@repo/contracts";
import { ArrowLeft, FolderKanban } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { ContextHero } from "@/components/system/context-hero";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

  return (
    <article
      className="flex w-full flex-col gap-6"
      aria-labelledby="project-title"
    >
      <Link
        href="/projects"
        className={buttonVariants({
          variant: "ghost",
          className: "self-start",
        })}
      >
        <ArrowLeft aria-hidden="true" /> Tất cả Project
      </Link>

      <ProjectFieldsProvider key={project.id} initialProject={project}>
        <ContextHero
          id="project-title"
          icon={FolderKanban}
          eyebrow="Crucible · Project"
          title={<ProjectDetailTitle />}
          description={
            <ProjectDetailDescription placeholder="Chưa có mô tả cho effort này." />
          }
          meta={
            <>
              {project.currentCycle ? (
                <Badge variant="outline">
                  Cycle {project.currentCycle.cycleNumber}
                </Badge>
              ) : null}
              <Badge
                variant={
                  project.lifecycleState === "STOPPED"
                    ? "destructive"
                    : "secondary"
                }
              >
                {STATE_LABEL[project.lifecycleState]}
              </Badge>
            </>
          }
          actions={
            <>
              <ProjectEditAction />
              {sourcesAction}
              <ProjectLifecycleControlsInline />
            </>
          }
        />
        {activityNotes}

        {hasOpenCycle && project.currentCycle ? (
          <Card className="gap-0 rounded-3xl bg-card/65 py-0 shadow-sm">
            <CardHeader className="border-b px-5 py-5 sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Intended Outcome — Cycle {project.currentCycle.cycleNumber}
              </p>
            </CardHeader>
            <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
              <ProjectOutcomeEditorInline timeZone={timeZone} />
              <div className="mt-6 border-t pt-5">
                <ProjectTargetEndEditorInline
                  today={todayInTimeZone(timeZone)}
                />
              </div>
              {activity}
            </CardContent>
          </Card>
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
