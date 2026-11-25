"use client";

import type { MemoryResponse } from "@repo/contracts";
import { ArrowLeft, BookOpenText, Pencil } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  formatMemoryOccurredOn,
  memoryOccurredOnDateTime,
} from "@/features/memory/lib/memory-date";
import {
  MemoryEditProvider,
  useMemoryEdit,
} from "@/features/memory/components/memory-edit-sheet";
import { MemoryLifecycleControls } from "@/features/memory/components/memory-lifecycle-controls";

interface MemoryDetailProps {
  memory: MemoryResponse;
  /** Múi giờ của tài khoản: server và trình duyệt định dạng giờ giống nhau. */
  timeZone: string;
}

const QUIET_LINK =
  "inline-flex items-center gap-1.5 self-start rounded-sm text-sm text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

const formatUpdatedAt = (value: string, timeZone: string) =>
  new Intl.DateTimeFormat("vi-VN", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone,
  }).format(new Date(value));

export function MemoryDetail({ memory, timeZone }: MemoryDetailProps) {
  return (
    <MemoryEditProvider key={memory.id} initialMemory={memory}>
      <MemoryDetailBody timeZone={timeZone} />
    </MemoryEditProvider>
  );
}

/** Đọc ký ức từ provider để hiện ngay bản vừa lưu trong sheet. */
function MemoryDetailBody({ timeZone }: { timeZone: string }) {
  const { memory, openEditor, preloadEditor } = useMemoryEdit();
  const occurredOnLabel = formatMemoryOccurredOn(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );
  const occurredOnDateTime = memoryOccurredOnDateTime(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );
  const trashed = memory.state === "TRASHED";

  return (
    <article
      className="flex w-full flex-col gap-8"
      aria-labelledby="memory-title"
    >
      <Link href="/memories" className={QUIET_LINK}>
        <ArrowLeft className="size-4" aria-hidden="true" /> Tất cả ký ức
      </Link>

      <header className="flex flex-wrap items-end justify-between gap-x-6 gap-y-5">
        <div className="flex max-w-3xl min-w-0 flex-col gap-2.5">
          <p className="font-mono text-[11px] font-medium tracking-[0.16em] text-primary uppercase">
            Reflection · Ký ức{trashed ? " · Thùng rác" : ""}
          </p>
          <h1
            id="memory-title"
            className="font-display text-4xl leading-[1.05] font-medium tracking-[-0.02em] text-balance sm:text-[46px]"
          >
            {memory.title}
          </h1>
          <p className="font-mono text-sm text-muted-foreground">
            {occurredOnDateTime ? (
              <time dateTime={occurredOnDateTime}>{occurredOnLabel}</time>
            ) : (
              occurredOnLabel
            )}
          </p>
        </div>
        <div className="flex flex-wrap gap-2.5">
          {trashed ? null : (
            <Button
              type="button"
              variant="outline"
              onClick={openEditor}
              onPointerEnter={preloadEditor}
              onFocus={preloadEditor}
            >
              <Pencil data-icon="inline-start" aria-hidden="true" />
              Chỉnh sửa
            </Button>
          )}
          <MemoryLifecycleControls
            id={memory.id}
            title={memory.title}
            state={memory.state}
            revision={memory.revision}
          />
        </div>
      </header>

      <section aria-labelledby="memory-content-heading" className="max-w-3xl">
        <h2 id="memory-content-heading" className="sr-only">
          Nội dung ký ức
        </h2>
        <p className="font-display text-lg leading-9 whitespace-pre-wrap text-foreground/90 sm:text-xl sm:leading-10">
          {memory.content}
        </p>
      </section>

      {memory.sourceJournalEntryId ? (
        <Link
          href={`/journal/${memory.sourceJournalEntryId}`}
          className={QUIET_LINK}
        >
          <BookOpenText className="size-4" aria-hidden="true" /> Được kết tinh
          từ một trang Nhật ký
        </Link>
      ) : null}

      <footer className="flex flex-wrap justify-end gap-2 border-t pt-4 font-mono text-xs text-muted-foreground">
        <time dateTime={memory.updatedAt}>
          Cập nhật {formatUpdatedAt(memory.updatedAt, timeZone)}
        </time>
      </footer>
    </article>
  );
}
