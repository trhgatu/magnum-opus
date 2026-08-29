import type { MemoryResponse } from "@repo/contracts";
import { BookOpenText, Gem, Trash2 } from "lucide-react";
import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  formatMemoryOccurredOn,
  memoryOccurredOnDateTime,
} from "@/features/memory/lib/memory-date";

interface MemoryCardProps {
  memory: MemoryResponse;
}

export function MemoryCard({ memory }: MemoryCardProps) {
  const occurredOnLabel = formatMemoryOccurredOn(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );

  const occurredOnDateTime = memoryOccurredOnDateTime(
    memory.occurredOn,
    memory.occurredOnPrecision,
  );

  return (
    <Link
      href={`/memories/${memory.id}`}
      aria-label={`Mở ký ức: ${memory.title}`}
      className="group block rounded-2xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-3"
    >
      <article className="relative flex min-h-72 flex-col overflow-hidden rounded-2xl border bg-card/75 transition duration-200 group-hover:-translate-y-1 group-hover:border-primary/30 group-hover:shadow-lg motion-reduce:transform-none">
        <div
          aria-hidden="true"
          className="absolute inset-y-0 left-0 w-1 bg-primary/25"
        />

        <header className="flex items-start justify-between gap-4 px-5 pt-5 sm:px-6">
          <div className="flex items-center gap-3">
            <span className="grid size-9 place-items-center rounded-full border border-primary/20 bg-primary/10 text-primary">
              <Gem className="size-4" aria-hidden="true" />
            </span>
            {occurredOnDateTime ? (
              <time
                dateTime={occurredOnDateTime}
                className="font-mono text-xs tracking-wide text-primary"
              >
                {occurredOnLabel}
              </time>
            ) : (
              <span className="font-mono text-xs tracking-wide text-muted-foreground">
                {occurredOnLabel}
              </span>
            )}
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            {memory.sourceJournalEntryId ? (
              <Badge variant="outline">
                <BookOpenText className="size-3" aria-hidden="true" />
                Từ Nhật ký
              </Badge>
            ) : null}
            {memory.state === "TRASHED" ? (
              <Badge variant="destructive">
                <Trash2 className="size-3" aria-hidden="true" />
                Thùng rác
              </Badge>
            ) : null}
          </div>
        </header>
        <div className="flex flex-1 flex-col px-5 pb-5 pt-7 sm:px-6">
          <h2 className="font-display line-clamp-2 text-2xl font-semibold tracking-tight text-balance transition-colors group-hover:text-primary">
            {memory.title}
          </h2>
          <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
            {memory.content}
          </p>
          <span
            className="mt-auto h-px w-14 bg-primary/25"
            aria-hidden="true"
          />
        </div>
        <footer className="flex items-center justify-between border-t bg-muted/30 px-5 py-3 sm:px-6">
          <span className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
            Hồ sơ lưu trữ
          </span>
          <span className="flex items-center gap-1 text-xs font-medium text-foreground/70 transition-colors group-hover:text-primary">
            Mở ký ức <span aria-hidden="true">↗</span>
          </span>
        </footer>
      </article>
    </Link>
  );
}
