import type { ProjectResponse } from "@repo/contracts";
import { ArrowLeft, FolderKanban, Pencil } from "lucide-react";
import Link from "next/link";

import { ContextHero } from "@/components/system/context-hero";
import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import {
  ProjectFieldsProvider,
  ProjectInlineDescription,
  ProjectInlineTitle,
  ProjectLifecycleControlsInline,
  ProjectOutcomeEditorInline,
} from "@/features/project/components/project-inline-fields";

const STATE_LABEL: Record<ProjectResponse["lifecycleState"], string> = {
  NOT_STARTED: "Chưa bắt đầu",
  ACTIVE: "Đang chạy",
  PAUSED: "Tạm dừng",
  STOPPED: "Đã dừng",
  COMPLETED: "Hoàn thành",
};

export function ProjectDetail({ project }: { project: ProjectResponse }) {
  const hasOpenCycle =
    project.lifecycleState === "ACTIVE" || project.lifecycleState === "PAUSED";

  return (
    <article
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
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
          title={<ProjectInlineTitle />}
          description={
            <ProjectInlineDescription placeholder="Chưa có mô tả cho effort này." />
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
              <Link
                href={`/projects/${project.id}/edit`}
                className={buttonVariants({ variant: "outline" })}
              >
                <Pencil aria-hidden="true" /> Chỉnh sửa
              </Link>
              <ProjectLifecycleControlsInline />
            </>
          }
        />

        {hasOpenCycle && project.currentCycle ? (
          <Card className="gap-0 rounded-3xl bg-card/65 py-0 shadow-sm">
            <CardHeader className="border-b px-5 py-5 sm:px-7">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">
                Intended Outcome — Cycle {project.currentCycle.cycleNumber}
              </p>
            </CardHeader>
            <CardContent className="px-5 py-6 sm:px-7 sm:py-7">
              <ProjectOutcomeEditorInline />
            </CardContent>
          </Card>
        ) : null}
      </ProjectFieldsProvider>

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
