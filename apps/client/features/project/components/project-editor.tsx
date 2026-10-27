"use client";

import { ArrowRight, FolderKanban } from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type FormEvent, useState, useTransition } from "react";

import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { createProject } from "@/features/project/actions/project";
import { useUnsavedChangesWarning } from "@/hooks/use-unsaved-changes-warning";
import { notifySuccess } from "@/lib/toast";

/**
 * Form tạo Project. Project đã có sửa tên và mô tả ngay trên trang chi tiết
 * (project-inline-fields).
 */
export function ProjectEditor() {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState<string>();
  const [isPending, startTransition] = useTransition();

  useUnsavedChangesWarning(title !== "" || description !== "");

  const submit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(undefined);

    startTransition(async () => {
      const result = await createProject({ title, description });

      if (result.status === "error") {
        setMessage(result.message);
        return;
      }

      void notifySuccess(`Đã tạo "${result.project.title}"`);

      router.push(`/projects/${result.project.id}`);
      router.refresh();
    });
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-busy={isPending}>
      {message ? (
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
            href="/projects"
            className={buttonVariants({ variant: "outline", size: "lg" })}
          >
            Hủy
          </Link>
          <Button type="submit" size="lg" disabled={isPending}>
            <ArrowRight aria-hidden="true" />
            {isPending ? "Đang lưu…" : "Tạo Project"}
          </Button>
        </footer>
      </section>
    </form>
  );
}
