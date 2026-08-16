import type { MemoryResponse } from "@repo/contracts";
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
      className="group block rounded-2xl focus-visible:outline-2 focus-visible:outline-offset-3"
    >
      <article className="relative flex min-h-64 flex-col overflow-hidden rounded-2xl border bg-card/70 p-5 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/35 group-hover:shadow-[0_24px_60px_-38px_color-mix(in_oklch,var(--foreground)_50%,transparent)] sm:p-6">
        <div
          aria-hidden="true"
          className="absolute inset-x-0 top-0 h-px bg-linear-to-r from-transparent via-primary/45 to-transparent"
        />

        <header className="flex items-start justify-between gap-4">
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

          <div className="flex flex-wrap justify-end gap-2">
            {memory.sourceJournalEntryId ? (
              <Badge variant="outline">Từ Journal</Badge>
            ) : null}

            {memory.state === "TRASHED" ? (
              <Badge variant="destructive">Trash</Badge>
            ) : null}
          </div>
        </header>

        <h2 className="mt-6 font-display line-clamp-2 text-2xl font-semibold tracking-tight transition-colors group-hover:text-primary">
          {memory.title}
        </h2>

        <p className="mt-3 line-clamp-4 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">
          {memory.content}
        </p>

        <footer className="mt-auto pt-7">
          <span className="text-xs font-medium text-foreground/65">
            Mở ký ức
          </span>
        </footer>
      </article>
    </Link>
  );
}
