"use client";

import type { ProjectResponse } from "@repo/contracts";
import { ArrowRight, FolderKanban, Save } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { ConflictAlert } from "@/components/system/conflict-alert";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  createProject,
  reloadProject,
  updateProject,
} from "@/features/project/actions/project";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { notifySuccess } from "@/lib/toast";

type PersistedProject = Pick<
  ProjectResponse,
  "id" | "title" | "description" | "revision"
>;

export function ProjectEditor({
  initialProject,
}: {
  initialProject?: PersistedProject;
}) {
  const router = useRouter();
  const [persistedProject, setPersistedProject] = useState(initialProject);
  const [title, setTitle] = useState(initialProject?.title ?? "");
  const [description, setDescription] = useState(
    initialProject?.description ?? "",
  );
  const [message, setMessage] = useState<string>();
  const [hasConflict, setHasConflict] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string>();
  const [isPending, startTransition] = useTransition();

  const isDirty =
    title !== (persistedProject?.title ?? "") ||
    description !== (persistedProject?.description ?? "");
  useUnsavedChangesWarning(isDirty);

  const applyPersistedProject = (project: PersistedProject) => {
    setPersistedProject(project);
    setTitle(project.title);
    setDescription(project.description ?? "");
    setMessage(undefined);
    setHasConflict(false);
    setRecoveryError(undefined);
  };

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(undefined);
    setRecoveryError(undefined);

    startTransition(async () => {
      const result = persistedProject
        ? await updateProject({
            id: persistedProject.id,
            title,
            description,
            expectedRevision: persistedProject.revision,
          })
        : await createProject({ title, description });

      if (result.status === "error") {
        setMessage(result.message);
        setHasConflict(result.code === "PROJECT_REVISION_CONFLICT");
        return;
      }

      void notifySuccess(
        persistedProject
          ? `Đã cập nhật "${result.project.title}"`
          : `Đã tạo "${result.project.title}"`,
      );

      router.push(`/projects/${result.project.id}`);
      router.refresh();
    });
  };

  const resolveConflict = (keepLocal: boolean) => {
    if (!persistedProject) {
      return;
    }

    setRecoveryError(undefined);

    startTransition(async () => {
      const latest = await reloadProject(persistedProject.id);

      if (latest.status === "error") {
        setRecoveryError(latest.message);
        return;
      }

      if (!keepLocal) {
        applyPersistedProject(latest.project);
        return;
      }

      const result = await updateProject({
        id: latest.project.id,
        title,
        description,
        expectedRevision: latest.project.revision,
      });

      if (result.status === "error") {
        setMessage(result.message);
        setHasConflict(result.code === "PROJECT_REVISION_CONFLICT");
        setRecoveryError(
          result.code === "PROJECT_REVISION_CONFLICT"
            ? "Project lại thay đổi trong lúc xử lý. Nội dung đang viết vẫn được giữ."
            : result.message,
        );
        return;
      }

      void notifySuccess(`Đã cập nhật "${result.project.title}"`);

      router.push(`/projects/${result.project.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={isPending}>
      {hasConflict ? (
        <ConflictAlert
          title="Project đã được thay đổi ở nơi khác"
          description="Nội dung đang viết vẫn còn nguyên trên màn hình. Chọn bản mới nhất để bỏ phần đang viết, hoặc chủ động ghi nội dung này lên revision mới nhất."
          busy={isPending}
          recoveryError={recoveryError}
          onUseLatest={() => resolveConflict(false)}
          onKeepLocal={() => resolveConflict(true)}
        />
      ) : message ? (
        <Alert variant="destructive">
          <AlertDescription>{message}</AlertDescription>
        </Alert>
      ) : null}
      <section className="overflow-hidden rounded-3xl bg-card/70 shadow-sm ring-1 ring-foreground/10">
        <header className="border-b px-5 py-5 sm:px-7 sm:py-6">
          <div className="flex items-start gap-3">
            <span className="grid size-10 shrink-0 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <FolderKanban className="size-4.5" aria-hidden="true" />
            </span>
            <div>
              <h2 className="font-display text-xl font-semibold">
                Định danh Project
              </h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">
                Một tên ngắn cho effort bạn muốn theo đuổi, kèm mô tả tùy chọn
                để giữ context.
              </p>
            </div>
          </div>
        </header>

        <div className="space-y-5 px-5 py-6 sm:px-7 sm:py-7">
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <Label htmlFor="project-title">Tên Project</Label>
              <span className="font-mono text-[11px] text-muted-foreground">
                {title.length}/200
              </span>
            </div>
            <Input
              id="project-title"
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              maxLength={200}
              required
              disabled={isPending}
              placeholder="Ví dụ: Xây dựng Crucible V1"
              className="h-12 text-base"
              autoFocus
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="project-description">Mô tả (tùy chọn)</Label>
            <Textarea
              id="project-description"
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              disabled={isPending}
              rows={4}
              placeholder="Effort này đại diện cho điều gì?"
            />
          </div>
        </div>

        <footer className="flex flex-col-reverse gap-3 border-t bg-muted/30 px-5 py-4 sm:flex-row sm:justify-end sm:px-7">
          <Link
            href={
              persistedProject
                ? `/projects/${persistedProject.id}`
                : "/projects"
            }
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Hủy
          </Link>
          <Button type="submit" size="lg" disabled={isPending}>
            {persistedProject ? (
              <Save aria-hidden="true" />
            ) : (
              <ArrowRight aria-hidden="true" />
            )}
            {isPending
              ? "Đang lưu…"
              : persistedProject
                ? "Lưu thay đổi"
                : "Tạo Project"}
          </Button>
        </footer>
      </section>
    </form>
  );
}
