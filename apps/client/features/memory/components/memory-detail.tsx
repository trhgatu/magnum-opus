import type { MemoryResponse } from "@repo/contracts";
import { ArrowLeft, BookOpenText, Pencil } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { buttonVariants } from "@/components/ui/button";
import {
  formatMemoryOccurredOn,
  memoryOccurredOnDateTime,
} from "@/features/memory/lib/memory-date";
import { MemoryLifecycleControls } from "@/features/memory/components/memory-lifecycle-controls";

interface MemoryDetailProps {
  memory: MemoryResponse;
}

const formatUpdatedAt = (value: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export function MemoryDetail({ memory }: MemoryDetailProps) {
  const occurredOnLabel = formatMemoryOccurredOn(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );

  const occurredOnDateTime = memoryOccurredOnDateTime(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );

  return (
    <article
      className="mx-auto flex w-full max-w-5xl flex-col gap-6"
      aria-labelledby="memory-title"
    >
      <nav
        aria-label="Điều hướng ký ức"
        className="flex flex-wrap items-center justify-between gap-3"
      >
        <Link
          href="/memories"
          className={buttonVariants({
            variant: "ghost",
          })}
        >
          <ArrowLeft data-icon="inline-start" aria-hidden="true" />
          Trở về ký ức
        </Link>

        <div className="flex flex-wrap items-center gap-2">
          {memory.state === "TRASHED" ? (
            <Badge variant="destructive">Thùng rác</Badge>
          ) : (
            <>
              <Badge variant="outline">Đang lưu giữ</Badge>

              <Link
                href={`/memories/${memory.id}/edit`}
                className={buttonVariants({
                  variant: "outline",
                })}
              >
                <Pencil data-icon="inline-start" aria-hidden="true" />
                Chỉnh sửa
              </Link>
            </>
          )}
          <MemoryLifecycleControls
            id={memory.id}
            title={memory.title}
            state={memory.state}
            revision={memory.revision}
          />
        </div>
      </nav>

      <div className="relative overflow-hidden rounded-3xl border bg-card/70 shadow-sm">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-primary/30"
        />
        <div className="flex items-center justify-between border-b bg-muted/20 px-6 py-3 font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-muted-foreground sm:px-10">
          <span>Hồ sơ lưu trữ</span>
        </div>
        <div className="px-6 py-8 sm:px-10 sm:py-12 lg:px-14">
          <header className="space-y-5">
            {occurredOnDateTime ? (
              <time
                dateTime={occurredOnDateTime}
                className="font-mono text-xs tracking-wide text-primary"
              >
                {occurredOnLabel}
              </time>
            ) : (
              <p className="font-mono text-xs tracking-wide text-muted-foreground">
                {occurredOnLabel}
              </p>
            )}

            <h1
              id="memory-title"
              className="font-display text-3xl font-semibold tracking-tight text-balance sm:text-5xl"
            >
              {memory.title}
            </h1>

            {memory.sourceJournalEntryId ? (
              <Link
                href={`/journal/${memory.sourceJournalEntryId}`}
                className={buttonVariants({
                  variant: "outline",
                  size: "sm",
                })}
              >
                <BookOpenText data-icon="inline-start" aria-hidden="true" />
                Mở Nhật ký nguồn
              </Link>
            ) : null}
          </header>

          <section
            className="mt-9 border-t pt-8"
            aria-labelledby="memory-content-heading"
          >
            <h2 id="memory-content-heading" className="sr-only">
              Nội dung ký ức
            </h2>

            <p className="whitespace-pre-wrap text-base leading-8 text-foreground/90 sm:text-lg sm:leading-9">
              {memory.content}
            </p>
          </section>

          <footer className="mt-10 flex flex-col gap-1 border-t pt-5 font-mono text-[11px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
            <time dateTime={memory.updatedAt}>
              Cập nhật {formatUpdatedAt(memory.updatedAt)}
            </time>

            <span>Magnum Opus · Reflection</span>
          </footer>
        </div>
      </div>
    </article>
  );
}
